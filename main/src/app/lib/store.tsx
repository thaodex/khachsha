import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  AuditEntry,
  Booking,
  BookingService,
  ChannelAccount,
  Customer,
  IdDocumentData,
  Invoice,
  LocalEvent,
  LoyaltyAccount,
  LoyaltyTxn,
  NotificationChannel,
  NotificationKind,
  NotificationLog,
  Payment,
  PaymentMethod,
  PaymentPurpose,
  PriceOverride,
  RatePlan,
  Review,
  Role,
  Room,
  RoomHold,
  RoomType,
  ServiceCatalogItem,
  User,
} from "./types";
import {
  seedBookings,
  seedCustomers,
  seedInvoices,
  seedRooms,
  seedRoomTypes,
  seedServices,
  seedUsers,
} from "./seed";
import {
  seedChannels,
  seedLocalEvents,
  seedLoyaltyAccounts,
  seedPriceOverrides,
  seedRatePlans,
  seedReviews,
} from "./seedExtra";
import { addDays, dateRangesOverlap, isISODate, nightsBetween, toISODate, uid } from "./format";
import { logger } from "./logger";
import { toast } from "sonner";
import {
  clearState,
  exportBackup,
  importBackup,
  isPersistenceAvailable,
  lastSavedAt,
  loadState,
  saveState,
} from "./persistence";
import { DEMO_PAYMENTS } from "./payments";
import { StayQuote, occupancyMap, quoteStay } from "./pricing";
import {
  HOLD_TTL_MINUTES,
  consumeHold,
  createHold,
  getSessionId,
  heldRoomIds,
  pruneHolds,
  releaseHold,
  releaseSessionHolds,
} from "./holds";
import { ConflictError, assertVersion, bookingMutex, nextVersion, runOnce } from "./concurrency";
import {
  VAT_RATE,
  confirmPayment as confirmGatewayPayment,
  createPayment,
  nextEInvoiceNo,
  paidTotal,
  refundPayment,
  splitVat,
} from "./payments";
import { accruePoints, emptyAccount, maxRedeemablePoints, redeemPoints } from "./loyalty";
import { dueNotifications, renderTemplate, retryFailed, sendNotification } from "./notifications";
import { analyzeSentiment } from "./sentiment";

export const HOTEL_NAME = "Sao Mai Hotel";
export const HOTEL_HOTLINE = "0900 000 000";
/** Tỷ lệ cọc giữ phòng (25% — trong khoảng 20–30% giá trị đặt phòng) */
export const DEPOSIT_PERCENT = 0.25;

/* ===========================================================================
 * PHÂN QUYỀN
 * =========================================================================*/

export type Permission =
  | "dashboard"
  | "calendar"
  | "rooms"
  | "customers"
  | "bookings"
  | "availability"
  | "services"
  | "invoices"
  | "stats"
  | "ai"
  | "requests"
  | "portal"
  | "revenue"
  | "reviews"
  | "channels"
  | "loyalty"
  | "ops"
  | "edit_price"
  | "refund"
  | "manage_users";

const ALL: Permission[] = [
  "dashboard", "calendar", "rooms", "customers", "bookings", "availability",
  "services", "invoices", "stats", "ai", "requests", "portal",
  "revenue", "reviews", "channels", "loyalty", "ops", "edit_price", "refund", "manage_users",
];

/**
 * Ma trận quyền theo vai trò. Nguyên tắc: chỉ cấp quyền tối thiểu đủ làm việc.
 * Lễ tân KHÔNG được sửa giá hay hoàn tiền — tránh gian lận nội bộ.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL,
  manager: [
    "dashboard", "calendar", "rooms", "customers", "bookings", "availability",
    "services", "invoices", "stats", "ai", "requests", "portal",
    "revenue", "reviews", "channels", "loyalty", "ops", "edit_price",
  ],
  reception: [
    "dashboard", "calendar", "rooms", "customers", "bookings", "availability",
    "services", "invoices", "ai", "requests", "portal", "reviews", "loyalty",
  ],
  accountant: [
    "dashboard", "invoices", "stats", "customers", "bookings", "revenue", "channels", "refund", "ops",
  ],
  guest: [],
};

export function hasPermission(user: User | null, perm: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role]?.includes(perm) ?? false;
}

/* ===========================================================================
 * KIỂU DỮ LIỆU LƯU TRỮ
 * =========================================================================*/

interface PersistedState {
  currentUser: User | null;
  users: User[];
  roomTypes: RoomType[];
  rooms: Room[];
  customers: Customer[];
  services: ServiceCatalogItem[];
  bookings: Booking[];
  invoices: Invoice[];
  holds: RoomHold[];
  payments: Payment[];
  loyaltyAccounts: LoyaltyAccount[];
  loyaltyTxns: LoyaltyTxn[];
  notifications: NotificationLog[];
  reviews: Review[];
  ratePlans: RatePlan[];
  priceOverrides: PriceOverride[];
  localEvents: LocalEvent[];
  channels: ChannelAccount[];
  auditLog: AuditEntry[];
}

interface NewBookingInput {
  roomId: string;
  customerId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  note?: string;
  status?: Booking["status"];
  source?: Booking["source"];
  /** Chuyển hold thành booking (giữ chỗ → đặt thật) */
  holdId?: string;
  /** Khóa chống gửi trùng khi khách bấm 2 lần */
  idempotencyKey?: string;
  channelRef?: string;
}

/** Dữ liệu sửa hồ sơ cá nhân (trang "Tài khoản của tôi"). */
export interface ProfilePatch {
  name?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  /** null = gỡ ảnh đại diện */
  avatar?: string | null;
  /** Bắt buộc khi đổi mật khẩu */
  currentPassword?: string;
  newPassword?: string;
}

interface StoreValue {
  /* --- dữ liệu --- */
  currentUser: User | null;
  users: User[];
  roomTypes: RoomType[];
  rooms: Room[];
  customers: Customer[];
  bookings: Booking[];
  services: ServiceCatalogItem[];
  invoices: Invoice[];
  holds: RoomHold[];
  payments: Payment[];
  loyaltyAccounts: LoyaltyAccount[];
  loyaltyTxns: LoyaltyTxn[];
  notifications: NotificationLog[];
  reviews: Review[];
  ratePlans: RatePlan[];
  priceOverrides: PriceOverride[];
  localEvents: LocalEvent[];
  channels: ChannelAccount[];
  auditLog: AuditEntry[];
  sessionId: string;

  /* --- tài khoản --- */
  login: (username: string, password: string) => User | null;
  logout: () => void;
  registerGuest: (input: { name: string; phone: string; email: string; password: string }) => { ok: boolean; message: string };
  can: (perm: Permission) => boolean;
  /** Tự cập nhật hồ sơ/ảnh đại diện/mật khẩu của chính người đang đăng nhập */
  updateProfile: (patch: ProfilePatch) => { ok: boolean; message: string };

  /* --- phòng --- */
  saveRoom: (room: Room) => void;
  deleteRoom: (id: string) => void;
  saveRoomType: (t: RoomType) => void;
  saveService: (s: ServiceCatalogItem) => void;
  deleteService: (id: string) => void;

  /* --- khách --- */
  saveCustomer: (c: Customer) => Customer;

  /* --- đặt phòng --- */
  findConflict: (roomId: string, checkIn: string, checkOut: string, ignoreId?: string) => Booking | null;
  getAvailableRooms: (checkIn: string, checkOut: string, guests?: number) => Room[];
  createBooking: (input: NewBookingInput) => { ok: boolean; message: string; booking?: Booking };
  /** Bản an toàn cho concurrency: khóa tuần tự + chống gửi trùng + kiểm tra lại trước khi ghi */
  createBookingSafe: (input: NewBookingInput) => Promise<{ ok: boolean; message: string; booking?: Booking }>;
  approveBooking: (id: string) => { ok: boolean; message: string };
  rejectBooking: (id: string, reason?: string) => void;
  /** Đổi yêu cầu sang một phòng khác CÙNG LOẠI còn trống rồi duyệt luôn (thay cho việc từ chối đơn gửi sau). */
  reassignBooking: (id: string, newRoomId: string) => { ok: boolean; message: string };
  updateBookingStatus: (id: string, status: Booking["status"], expectedVersion?: number) => { ok: boolean; message: string };
  cancelBooking: (id: string, reason: string) => { ok: boolean; message: string };
  markNoShow: (id: string) => void;
  checkInWithDocument: (bookingId: string, doc: IdDocumentData) => { ok: boolean; message: string };
  addServiceToBooking: (bookingId: string, svc: BookingService) => void;
  removeServiceFromBooking: (bookingId: string, index: number) => void;

  /* --- giữ chỗ tạm thời --- */
  holdRoom: (input: { roomId: string; checkIn: string; checkOut: string; guests: number; customerId?: string }) =>
    { ok: boolean; message: string; hold?: RoomHold };
  dropHold: (holdId: string) => void;
  dropMyHolds: () => void;
  myActiveHolds: () => RoomHold[];
  blockedRoomIds: (checkIn: string, checkOut: string) => Set<string>;

  /* --- giá động --- */
  quoteFor: (typeId: string, checkIn: string, checkOut: string) => StayQuote | null;
  activeRatePlan: RatePlan;
  saveRatePlan: (p: RatePlan) => void;
  setActiveRatePlan: (id: string) => void;
  addPriceOverride: (o: Omit<PriceOverride, "id" | "createdAt" | "createdBy">) => void;
  removePriceOverride: (id: string) => void;
  saveLocalEvent: (e: LocalEvent) => void;
  deleteLocalEvent: (id: string) => void;

  /* --- hóa đơn & thanh toán --- */
  ensureInvoice: (bookingId: string) => Invoice;
  recordPayment: (invoiceId: string, amount: number) => void;
  issueEInvoice: (invoiceId: string) => Invoice | null;
  bookingTotalOf: (b: Booking) => number;
  amountPaid: (bookingId: string) => number;
  startPayment: (args: {
    bookingId: string;
    method: PaymentMethod;
    purpose: PaymentPurpose;
    amount: number;
    invoiceId?: string;
  }) => Promise<{ ok: boolean; message: string; payment?: Payment }>;
  settlePayment: (paymentId: string, succeeded: boolean, reason?: string) => void;
  refundOne: (paymentId: string) => Promise<{ ok: boolean; message: string }>;
  payDeposit: (bookingId: string) => void;
  payDepositWithGateway: (bookingId: string, method: PaymentMethod) => Promise<{ ok: boolean; message: string }>;

  /* --- loyalty --- */
  loyaltyOf: (customerId: string) => LoyaltyAccount;
  redeemLoyalty: (customerId: string, points: number, invoiceId: string) => { ok: boolean; message: string };

  /* --- thông báo --- */
  notify: (bookingId: string, kind: NotificationKind, channel?: NotificationChannel) => Promise<void>;
  runDueNotifications: () => Promise<number>;
  retryFailedNotifications: () => Promise<void>;

  /* --- đánh giá --- */
  addReview: (r: Omit<Review, "id" | "createdAt" | "sentiment" | "topics" | "sentimentConfidence">) => void;
  replyToReview: (id: string) => void;
  overrideSentiment: (id: string, sentiment: Review["sentiment"]) => void;

  /* --- kênh OTA --- */
  saveChannel: (c: ChannelAccount) => void;
  syncChannel: (id: string) => void;

  /* --- vận hành --- */
  pushAudit: (action: string, target?: string, detail?: string) => void;
  backupNow: () => void;
  restoreFromFile: (file: File) => Promise<{ ok: boolean; message: string }>;
  resetAll: () => void;
  storageInfo: () => { available: boolean; savedAt: string | null };

  /* --- helpers --- */
  roomType: (typeId: string) => RoomType | undefined;
  roomLabel: (roomId: string) => string;
  customer: (id: string) => Customer | undefined;
  booking: (id: string) => Booking | undefined;
}

const StoreContext = createContext<StoreValue | null>(null);

/* ===========================================================================
 * PROVIDER
 * =========================================================================*/

export function StoreProvider({ children }: { children: ReactNode }) {
  // Nạp lại trạng thái đã lưu — refresh trang không mất dữ liệu.
  // Dùng useRef + cờ để chỉ đọc localStorage đúng 1 lần, không parse lại mỗi render.
  const restoredRef = useRef<{ value: PersistedState | null } | null>(null);
  if (!restoredRef.current) restoredRef.current = { value: loadState<PersistedState>() };
  const restored = restoredRef.current.value;

  const [currentUser, setCurrentUser] = useState<User | null>(restored?.currentUser ?? null);
  const [users, setUsers] = useState<User[]>(() => {
    const initialUsers = restored?.users ?? seedUsers;
    // Khôi phục mật khẩu admin về mặc định nếu lỡ quên
    return initialUsers.map(u => u.username === 'admin' ? { ...u, password: 'admin123' } : u);
  });
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(() => {
    const rts = restored?.roomTypes ?? seedRoomTypes;
    const missing = seedRoomTypes.filter(srt => !rts.some(rt => rt.id === srt.id));
    // Cập nhật lại ảnh cho các phòng mới nếu trong local storage đang lưu ảnh cũ
    return [...rts, ...missing].map(rt => {
      const seedRt = seedRoomTypes.find(s => s.id === rt.id);
      if (seedRt && ['rt4', 'rt5', 'rt6'].includes(rt.id)) {
        return { ...rt, image: seedRt.image };
      }
      return rt;
    });
  });
  const [rooms, setRooms] = useState<Room[]>(() => {
    const rms = restored?.rooms ?? seedRooms;
    const missing = seedRooms.filter(sr => !rms.some(r => r.id === sr.id));
    return [...rms, ...missing];
  });
  const [customers, setCustomers] = useState<Customer[]>(restored?.customers ?? seedCustomers);
  const [bookings, setBookings] = useState<Booking[]>(restored?.bookings ?? seedBookings);
  const [services, setServices] = useState<ServiceCatalogItem[]>(() => {
    const svcs = restored?.services ?? seedServices;
    const missing = seedServices.filter(ss => !svcs.some(s => s.id === ss.id));
    return [...svcs, ...missing];
  });
  const [invoices, setInvoices] = useState<Invoice[]>(restored?.invoices ?? seedInvoices);

  const [holds, setHolds] = useState<RoomHold[]>(restored?.holds ?? []);
  const [payments, setPayments] = useState<Payment[]>(restored?.payments ?? []);
  const [loyaltyAccounts, setLoyaltyAccounts] = useState<LoyaltyAccount[]>(
    restored?.loyaltyAccounts ?? seedLoyaltyAccounts,
  );
  const [loyaltyTxns, setLoyaltyTxns] = useState<LoyaltyTxn[]>(restored?.loyaltyTxns ?? []);
  const [notifications, setNotifications] = useState<NotificationLog[]>(restored?.notifications ?? []);
  const [reviews, setReviews] = useState<Review[]>(restored?.reviews ?? seedReviews);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>(restored?.ratePlans ?? seedRatePlans);
  const [priceOverrides, setPriceOverrides] = useState<PriceOverride[]>(
    restored?.priceOverrides ?? seedPriceOverrides,
  );
  const [localEvents, setLocalEvents] = useState<LocalEvent[]>(restored?.localEvents ?? seedLocalEvents);
  const [channels, setChannels] = useState<ChannelAccount[]>(restored?.channels ?? seedChannels);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(restored?.auditLog ?? []);

  const sessionId = useMemo(() => getSessionId(), []);

  /* ------------------------------------------------------ NHẬT KÝ --------*/

  const pushAudit = useCallback(
    (action: string, target?: string, detail?: string) => {
      const entry: AuditEntry = {
        id: uid("aud"),
        at: new Date().toISOString(),
        actor: currentUser?.name ?? "Khách/Hệ thống",
        action,
        target,
        detail,
      };
      setAuditLog((prev) => [entry, ...prev].slice(0, 500));
      logger.info("audit", action, { target, detail });
    },
    [currentUser],
  );

  /* --------------------------------------------------- LƯU TỰ ĐỘNG ------*/

  useEffect(() => {
    saveState<PersistedState>({
      currentUser, users, roomTypes, rooms, customers, bookings, services, invoices,
      holds, payments, loyaltyAccounts, loyaltyTxns, notifications, reviews,
      ratePlans, priceOverrides, localEvents, channels, auditLog,
    });
  }, [
    currentUser, users, roomTypes, rooms, customers, bookings, services, invoices,
    holds, payments, loyaltyAccounts, loyaltyTxns, notifications, reviews,
    ratePlans, priceOverrides, localEvents, channels, auditLog,
  ]);

  /* --------------------------------- DỌN HOLD HẾT HẠN ĐỊNH KỲ ----------*/

  useEffect(() => {
    const timer = setInterval(() => {
      setHolds((prev) => {
        const { kept, expired } = pruneHolds(prev);
        return expired.length ? kept : prev;
      });
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  /* ------------------------------------------------------ HELPERS --------*/

  const roomType = useCallback((typeId: string) => roomTypes.find((t) => t.id === typeId), [roomTypes]);
  const roomLabel = useCallback(
    (roomId: string) => {
      const r = rooms.find((x) => x.id === roomId);
      if (!r) return roomId;
      const t = roomTypes.find((x) => x.id === r.typeId);
      return `${r.number}${t ? ` · ${t.name}` : ""}`;
    },
    [rooms, roomTypes],
  );
  const customer = useCallback((id: string) => customers.find((c) => c.id === id), [customers]);
  const booking = useCallback((id: string) => bookings.find((b) => b.id === id), [bookings]);
  const can = useCallback((perm: Permission) => hasPermission(currentUser, perm), [currentUser]);

  const bookingTotalOf = useCallback((b: Booking) => {
    const roomTotal = b.nightlyRates?.length
      ? b.nightlyRates.reduce((s, n) => s + n.price, 0)
      : nightsBetween(b.checkIn, b.checkOut) * b.roomPricePerNight;
    const serviceTotal = b.services.reduce((s, x) => s + x.price * x.qty, 0);
    return roomTotal + serviceTotal;
  }, []);

  const amountPaid = useCallback((bookingId: string) => paidTotal(payments, bookingId), [payments]);

  /* -------------------------------------------------- TÀI KHOẢN ---------*/

  const login = useCallback(
    (username: string, password: string) => {
      const u = users.find((x) => x.username === username && x.password === password) || null;
      setCurrentUser(u);
      if (u) logger.info("auth", `Đăng nhập: ${u.name} (${u.role})`);
      else logger.warn("auth", `Đăng nhập thất bại cho "${username}"`);
      return u;
    },
    [users],
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    setHolds((prev) => releaseSessionHolds(prev, sessionId));
  }, [sessionId]);

  /**
   * Cập nhật hồ sơ của chính mình. Không cho đổi vai trò/tên đăng nhập ở đây —
   * đó là việc của quản trị viên, tránh nhân viên tự nâng quyền.
   */
  const updateProfile = useCallback<StoreValue["updateProfile"]>(
    (patch) => {
      if (!currentUser) return { ok: false, message: "Chưa đăng nhập." };

      const name = patch.name?.trim();
      if (patch.name !== undefined && !name)
        return { ok: false, message: "Họ tên không được để trống." };
      const email = patch.email?.trim();
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
        return { ok: false, message: "Email không hợp lệ." };
      const phone = patch.phone?.trim();
      if (phone && !/^[0-9+()\s.-]{8,15}$/.test(phone))
        return { ok: false, message: "Số điện thoại không hợp lệ." };

      if (patch.newPassword !== undefined) {
        if (patch.currentPassword !== currentUser.password)
          return { ok: false, message: "Mật khẩu hiện tại không đúng." };
        if (patch.newPassword.length < 4)
          return { ok: false, message: "Mật khẩu mới tối thiểu 4 ký tự." };
        if (patch.newPassword === currentUser.password)
          return { ok: false, message: "Mật khẩu mới phải khác mật khẩu cũ." };
      }

      const next: User = {
        ...currentUser,
        ...(name ? { name } : {}),
        ...(patch.email !== undefined ? { email } : {}),
        ...(patch.phone !== undefined ? { phone } : {}),
        ...(patch.jobTitle !== undefined ? { jobTitle: patch.jobTitle.trim() } : {}),
        ...(patch.avatar !== undefined ? { avatar: patch.avatar ?? undefined } : {}),
        ...(patch.newPassword ? { password: patch.newPassword } : {}),
      };

      setUsers((prev) => prev.map((u) => (u.id === next.id ? next : u)));
      setCurrentUser(next);
      pushAudit(
        patch.newPassword ? "Đổi mật khẩu" : "Cập nhật hồ sơ cá nhân",
        next.id,
        patch.newPassword ? undefined : next.name,
      );
      logger.info("auth", `Cập nhật hồ sơ: ${next.name}`);
      return {
        ok: true,
        message: patch.newPassword ? "Đã đổi mật khẩu thành công." : "Đã lưu thông tin cá nhân.",
      };
    },
    [currentUser, pushAudit],
  );

  const saveCustomer = useCallback((c: Customer) => {
    let result = c;
    setCustomers((prev) => {
      const exists = prev.some((x) => x.id === c.id);
      if (exists) return prev.map((x) => (x.id === c.id ? c : x));
      result = { ...c, id: c.id || uid("c") };
      return [...prev, result];
    });
    return result;
  }, []);

  const registerGuest = useCallback<StoreValue["registerGuest"]>(
    (input) => {
      const name = input.name.trim();
      const phone = input.phone.trim();
      const email = input.email.trim();
      const password = input.password;
      if (!name || !phone || !password)
        return { ok: false, message: "Vui lòng nhập đủ họ tên, số điện thoại và mật khẩu." };
      if (password.length < 8) return { ok: false, message: "Mật khẩu tối thiểu 8 ký tự." };
      if (users.some((u) => u.username === phone))
        return { ok: false, message: "Số điện thoại này đã được đăng ký. Vui lòng đăng nhập." };

      const existing = customers.find((c) => c.phone.trim() === phone);
      const cust =
        existing ??
        saveCustomer({
          id: "", name, phone, email, idNumber: "", address: "",
          createdAt: toISODate(new Date()),
          // Ghi nhận đồng ý chính sách dữ liệu cá nhân (Nghị định 13/2023)
          consentAt: new Date().toISOString(),
        });

      const user: User = {
        id: uid("u"), name, username: phone, password, role: "guest", phone, email, customerId: cust.id,
      };
      setUsers((prev) => [...prev, user]);
      setCurrentUser(user);
      setLoyaltyAccounts((prev) =>
        prev.some((a) => a.customerId === cust.id) ? prev : [...prev, emptyAccount(cust.id)],
      );
      pushAudit("Đăng ký tài khoản khách", cust.id, name);
      return { ok: true, message: "Đăng ký thành công!" };
    },
    [users, customers, saveCustomer, pushAudit],
  );

  /* ------------------------------------------------------- PHÒNG ---------*/

  const saveRoom = useCallback((room: Room) => {
    setRooms((prev) => {
      const exists = prev.some((r) => r.id === room.id);
      return exists ? prev.map((r) => (r.id === room.id ? room : r)) : [...prev, room];
    });
  }, []);
  const deleteRoom = useCallback((id: string) => setRooms((prev) => prev.filter((r) => r.id !== id)), []);
  const saveRoomType = useCallback((t: RoomType) => {
    setRoomTypes((prev) => {
      const exists = prev.some((x) => x.id === t.id);
      return exists ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t];
    });
  }, []);
  const saveService = useCallback((s: ServiceCatalogItem) => setServices((p) => [...p.filter((x) => x.id !== s.id), s]), []);
  const deleteService = useCallback((id: string) => setServices((p) => p.filter((x) => x.id !== id)), []);

  /* --------------------------------------------------- GIÁ ĐỘNG ---------*/

  const activeRatePlan = useMemo(
    () => ratePlans.find((p) => p.active) ?? ratePlans[0],
    [ratePlans],
  );

  const quoteFor = useCallback<StoreValue["quoteFor"]>(
    (typeId, checkIn, checkOut) => {
      const rt = roomTypes.find((t) => t.id === typeId);
      if (!rt || !checkIn || !checkOut || checkIn >= checkOut) return null;
      const days = Math.max(1, nightsBetween(checkIn, checkOut));
      return quoteStay(checkIn, checkOut, {
        roomType: rt,
        plan: activeRatePlan,
        events: localEvents,
        overrides: priceOverrides,
        occupancyByDate: occupancyMap(checkIn, days, rooms, bookings),
      });
    },
    [roomTypes, activeRatePlan, localEvents, priceOverrides, rooms, bookings],
  );

  const saveRatePlan = useCallback(
    (p: RatePlan) => {
      setRatePlans((prev) => (prev.some((x) => x.id === p.id) ? prev.map((x) => (x.id === p.id ? p : x)) : [...prev, p]));
      pushAudit("Cập nhật bảng giá", p.id, p.name);
    },
    [pushAudit],
  );

  const setActiveRatePlan = useCallback(
    (id: string) => {
      setRatePlans((prev) => prev.map((p) => ({ ...p, active: p.id === id })));
      pushAudit("Đổi bảng giá đang áp dụng", id);
    },
    [pushAudit],
  );

  const addPriceOverride = useCallback<StoreValue["addPriceOverride"]>(
    (o) => {
      const item: PriceOverride = {
        ...o,
        id: uid("po"),
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.name ?? "Hệ thống",
      };
      setPriceOverrides((prev) => [...prev.filter((x) => !(x.typeId === o.typeId && x.date === o.date)), item]);
      pushAudit("Chốt giá thủ công", `${o.typeId} ${o.date}`, `${o.price} — ${o.reason}`);
    },
    [currentUser, pushAudit],
  );

  const removePriceOverride = useCallback(
    (id: string) => {
      setPriceOverrides((prev) => prev.filter((x) => x.id !== id));
      pushAudit("Xóa giá chốt thủ công", id);
    },
    [pushAudit],
  );

  const saveLocalEvent = useCallback(
    (e: LocalEvent) => {
      setLocalEvents((prev) =>
        prev.some((x) => x.id === e.id) ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, { ...e, id: e.id || uid("ev") }],
      );
      pushAudit("Cập nhật sự kiện địa phương", e.id, e.name);
    },
    [pushAudit],
  );

  const deleteLocalEvent = useCallback((id: string) => setLocalEvents((prev) => prev.filter((x) => x.id !== id)), []);

  /* ------------------------------------------------ GIỮ CHỖ TẠM ---------*/

  const holdRoom = useCallback<StoreValue["holdRoom"]>(
    (input) => {
      const room = rooms.find((r) => r.id === input.roomId);
      const type = roomTypes.find((t) => t.id === room?.typeId);
      if (!room || !type || room.status === "maintenance" || input.guests > type.capacity) return { ok: false, message: "Phòng không khả dụng hoặc vượt sức chứa." };
      const res = createHold(holds, bookings, { ...input, sessionId });
      if (!res.ok) return { ok: false, message: res.message };
      setHolds((prev) => [...prev, res.hold]);
      return {
        ok: true,
        message: `Đã giữ phòng ${HOLD_TTL_MINUTES} phút để bạn hoàn tất đặt phòng.`,
        hold: res.hold,
      };
    },
    [holds, bookings, sessionId, rooms, roomTypes],
  );

  const dropHold = useCallback((holdId: string) => setHolds((prev) => releaseHold(prev, holdId)), []);
  const dropMyHolds = useCallback(
    () => setHolds((prev) => releaseSessionHolds(prev, sessionId)),
    [sessionId],
  );
  const myActiveHolds = useCallback(
    () => holds.filter((h) => h.sessionId === sessionId && !h.releasedAt && !h.convertedBookingId && new Date(h.expiresAt) > new Date()),
    [holds, sessionId],
  );
  const blockedRoomIds = useCallback(
    (checkIn: string, checkOut: string) => heldRoomIds(holds, checkIn, checkOut, sessionId),
    [holds, sessionId],
  );

  /* ------------------------------------------------- ĐẬT PHÒNG ----------*/

  const findConflict = useCallback(
    (roomId: string, checkIn: string, checkOut: string, ignoreId?: string) =>
      bookings.find(
        (b) =>
          b.roomId === roomId &&
          b.id !== ignoreId &&
          (b.status === "reserved" || b.status === "checked_in" || (b.status === "pending" && b.depositPaid)) &&
          dateRangesOverlap(b.checkIn, b.checkOut, checkIn, checkOut),
      ) || null,
    [bookings],
  );

  const getAvailableRooms = useCallback(
    (checkIn: string, checkOut: string, guests = 1) => {
      if (!isISODate(checkIn) || !isISODate(checkOut) || checkOut <= checkIn || !Number.isInteger(guests) || guests < 1) return [];
      const blocked = heldRoomIds(holds, checkIn, checkOut, sessionId);
      return rooms.filter((r) => {
        if (r.status === "maintenance") return false;
        if (blocked.has(r.id)) return false; // phiên khác đang giữ
        const t = roomTypes.find((x) => x.id === r.typeId);
        if (t && t.capacity < guests) return false;
        return !bookings.some(
          (b) =>
            b.roomId === r.id &&
            (b.status === "reserved" || b.status === "checked_in" || (b.status === "pending" && b.depositPaid)) &&
            dateRangesOverlap(b.checkIn, b.checkOut, checkIn, checkOut),
        );
      });
    },
    [rooms, roomTypes, bookings, holds, sessionId],
  );

  /** Xây bản ghi đặt phòng + áp giá động. Không ghi state ở đây. */
  const buildBooking = useCallback(
    (input: NewBookingInput): { ok: false; message: string } | { ok: true; booking: Booking } => {
      if (!input.roomId || !input.customerId) return { ok: false, message: "Vui lòng chọn phòng và khách hàng." };
      if (nightsBetween(input.checkIn, input.checkOut) < 1)
        return { ok: false, message: "Ngày trả phòng phải sau ngày nhận phòng." };

      const conflict = findConflict(input.roomId, input.checkIn, input.checkOut);
      if (conflict)
        return {
          ok: false,
          message: `Phòng đã được đặt trùng lịch (${conflict.code}: ${conflict.checkIn} → ${conflict.checkOut}).`,
        };

      const r = rooms.find((x) => x.id === input.roomId);
      const t = r ? roomTypes.find((x) => x.id === r.typeId) : undefined;
      if (!r || !t || r.status === "maintenance") return { ok: false, message: "Phòng không khả dụng." };
      if (!Number.isInteger(input.guests) || input.guests < 1) return { ok: false, message: "Số khách không hợp lệ." };
      if (input.holdId) {
        const hold = holds.find((h) => h.id === input.holdId);
        if (!hold || hold.releasedAt || hold.convertedBookingId || hold.sessionId !== sessionId || hold.roomId !== input.roomId || hold.checkIn !== input.checkIn || hold.checkOut !== input.checkOut || new Date(hold.expiresAt).getTime() <= Date.now()) return { ok: false, message: "Lượt giữ phòng đã hết hiệu lực. Vui lòng chọn lại phòng." };
      }
      const guestsCap = t.capacity;
      if (input.guests > guestsCap) return { ok: false, message: `Phòng chỉ chứa tối đa ${guestsCap} khách.` };

      // Kiểm tra hold của phiên khác (lớp thứ hai chống double-booking)
      const blocked = heldRoomIds(holds, input.checkIn, input.checkOut, sessionId);
      if (blocked.has(input.roomId))
        return { ok: false, message: "Khách khác đang giữ phòng này. Vui lòng chọn phòng khác." };

      // Áp giá động
      const quote = t ? quoteFor(t.id, input.checkIn, input.checkOut) : null;
      const nights = nightsBetween(input.checkIn, input.checkOut);
      const roomTotal = quote?.total ?? (t?.basePrice ?? 0) * nights;
      const channel = channels.find((c) => c.channel === input.source && c.commissionRate > 0);

      const status = input.status ?? "reserved";
      const b: Booking = {
        id: uid("b"),
        code: `BK-${1000 + bookings.length + 1}`,
        roomId: input.roomId,
        customerId: input.customerId,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        guests: input.guests,
        status,
        roomPricePerNight: quote?.avgPerNight ?? t?.basePrice ?? 0,
        nightlyRates: quote?.nights.map((n) => ({ date: n.date, price: n.price })),
        services: [],
        createdAt: new Date().toISOString(),
        note: input.note,
        source: input.source,
        holdId: input.holdId,
        channelRef: input.channelRef,
        channelCommission: channel ? Math.round(roomTotal * channel.commissionRate) : undefined,
        depositPercent: DEPOSIT_PERCENT,
        depositAmount: Math.round(roomTotal * DEPOSIT_PERCENT),
        depositPaid: false,
        version: 1,
      };
      return { ok: true, booking: b };
    },
    [findConflict, rooms, roomTypes, holds, sessionId, quoteFor, channels, bookings.length],
  );

  const commitBooking = useCallback(
    (b: Booking, holdId?: string) => {
      setBookings((prev) => [...prev, b]);
      if (holdId) setHolds((prev) => consumeHold(prev, holdId, b.id));
      pushAudit("Tạo đặt phòng", b.code, `${roomLabel(b.roomId)} ${b.checkIn} → ${b.checkOut}`);
    },
    [pushAudit, roomLabel],
  );

  const createBooking = useCallback<StoreValue["createBooking"]>(
    (input) => {
      const built = buildBooking(input);
      if (!built.ok) return { ok: false, message: built.message };
      commitBooking(built.booking, input.holdId);
      return {
        ok: true,
        message:
          built.booking.status === "pending"
            ? `Đã gửi yêu cầu ${built.booking.code}, chờ lễ tân duyệt.`
            : `Đã tạo đặt phòng ${built.booking.code}.`,
        booking: built.booking,
      };
    },
    [buildBooking, commitBooking],
  );

  /**
   * Bản an toàn cho tình huống nhiều người đặt cùng 1 phòng:
   *  - `bookingMutex` → các yêu cầu xết hàng tuần tự, không chạy chèn nhau
   *  - `runOnce` → khách bấm 2 lần chỉ tạo 1 đơn
   *  - kiểm tra trùng lịch LẠI ngay trước khi ghi
   */
  const createBookingSafe = useCallback<StoreValue["createBookingSafe"]>(
    async (input) => {
      const key = input.idempotencyKey ?? `${input.roomId}|${input.checkIn}|${input.checkOut}|${input.customerId}`;
      try {
        return await runOnce(key, () =>
          bookingMutex.runExclusive(async () => {
            const built = buildBooking(input);
            if (!built.ok) return { ok: false, message: built.message };
            commitBooking(built.booking, input.holdId);
            return {
              ok: true,
              message:
                built.booking.status === "pending"
                  ? `Đã gửi yêu cầu ${built.booking.code}, chờ lễ tân duyệt.`
                  : `Đã tạo đặt phòng ${built.booking.code}.`,
              booking: built.booking,
            };
          }),
        );
      } catch (err) {
        logger.error("booking", "Tạo đặt phòng thất bại", err);
        return { ok: false, message: err instanceof Error ? err.message : "Không tạo được đặt phòng." };
      }
    },
    [buildBooking, commitBooking],
  );

  const approveBooking = useCallback<StoreValue["approveBooking"]>(
    (id) => {
      const b = bookings.find((x) => x.id === id);
      if (!b) return { ok: false, message: "Không tìm thấy yêu cầu." };
      const conflict = findConflict(b.roomId, b.checkIn, b.checkOut, b.id);
      if (conflict)
        return { ok: false, message: `Không thể duyệt: phòng đã bị đặt trùng lịch (${conflict.code}).` };
      setBookings((prev) =>
        prev.map((x) =>
          x.id === id
            ? { ...x, status: "reserved", reviewedAt: new Date().toISOString(), version: nextVersion(x.version) }
            : x,
        ),
      );
      pushAudit("Duyệt yêu cầu đặt phòng", b.code);
      
      const cust = customers.find(c => c.id === b.customerId);
      if (cust && (cust.email || cust.phone)) {
        setTimeout(() => toast.success(`Đã gửi email thông báo duyệt phòng tới ${cust.email || cust.phone}`), 500);
      }

      return { ok: true, message: `Đã duyệt yêu cầu ${b.code}.` };
    },
    [bookings, findConflict, pushAudit, customers],
  );

  const rejectBooking = useCallback<StoreValue["rejectBooking"]>(
    (id, reason) => {
      setBookings((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "cancelled",
                reviewedAt: new Date().toISOString(),
                cancelReason: reason ?? "Lễ tân từ chối yêu cầu",
                version: nextVersion(x.version),
              }
            : x,
        ),
      );
      pushAudit("Từ chối yêu cầu đặt phòng", id, reason);
    },
    [pushAudit],
  );

  const reassignBooking = useCallback<StoreValue["reassignBooking"]>(
    (id, newRoomId) => {
      const b = bookings.find((x) => x.id === id);
      if (!b) return { ok: false, message: "Không tìm thấy yêu cầu." };
      if (b.status !== "pending")
        return { ok: false, message: "Chỉ có thể đổi phòng cho yêu cầu đang chờ duyệt." };
      if (newRoomId === b.roomId)
        return { ok: false, message: "Phòng mới trùng với phòng đang yêu cầu." };

      const oldRoom = rooms.find((r) => r.id === b.roomId);
      const newRoom = rooms.find((r) => r.id === newRoomId);
      if (!newRoom) return { ok: false, message: "Không tìm thấy phòng cần chuyển sang." };
      if (oldRoom && newRoom.typeId !== oldRoom.typeId)
        return { ok: false, message: "Chỉ được đổi sang phòng CÙNG LOẠI với phòng khách yêu cầu." };
      const rt = roomTypes.find((t) => t.id === newRoom.typeId);
      if (rt && rt.capacity < b.guests)
        return { ok: false, message: "Phòng mới không đủ sức chứa cho số khách." };

      const conflict = findConflict(newRoomId, b.checkIn, b.checkOut, b.id);
      if (conflict)
        return { ok: false, message: `Phòng ${newRoom.number} đã bị đặt trùng lịch (${conflict.code}).` };

      setBookings((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                roomId: newRoomId,
                status: "reserved",
                reviewedAt: new Date().toISOString(),
                note: [x.note, `Lễ tân đổi từ phòng ${oldRoom?.number ?? b.roomId} sang ${newRoom.number} (cùng loại) do trùng lịch.`]
                  .filter(Boolean)
                  .join(" · "),
                version: nextVersion(x.version),
              }
            : x,
        ),
      );
      pushAudit("Đổi phòng & duyệt yêu cầu", b.code, `${oldRoom?.number ?? b.roomId} → ${newRoom.number}`);

      const cust = customers.find((c) => c.id === b.customerId);
      if (cust && (cust.email || cust.phone)) {
        setTimeout(
          () => toast.success(`Đã gửi email thông báo đổi sang phòng ${newRoom.number} tới ${cust.email || cust.phone}`),
          500,
        );
      }

      return { ok: true, message: `Đã đổi ${b.code} sang phòng ${newRoom.number} cùng loại và duyệt.` };
    },
    [bookings, rooms, roomTypes, findConflict, pushAudit, customers],
  );

  const updateBookingStatus = useCallback<StoreValue["updateBookingStatus"]>(
    (id, status, expectedVersion) => {
      const b = bookings.find((x) => x.id === id);
      if (!b) return { ok: false, message: "Không tìm thấy đặt phòng." };
      try {
        if (expectedVersion !== undefined) assertVersion(b.version, expectedVersion, `đặt phòng ${b.code}`);
      } catch (err) {
        if (err instanceof ConflictError) return { ok: false, message: err.message };
        throw err;
      }

      setBookings((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status, version: nextVersion(x.version) } : x)),
      );

      // Đồng bộ trạng thái phòng
      setRooms((prev) =>
        prev.map((r) => {
          if (r.id !== b.roomId) return r;
          if (status === "checked_in") return { ...r, status: "occupied" };
          if (status === "checked_out") return { ...r, status: "cleaning" };
          if (status === "cancelled") return { ...r, status: "available" };
          return r;
        }),
      );

      // Tích điểm khi trả phòng
      if (status === "checked_out") {
        const spend = bookingTotalOf(b);
        setLoyaltyAccounts((prev) => {
          const acc = prev.find((a) => a.customerId === b.customerId) ?? emptyAccount(b.customerId);
          const { account, txn } = accruePoints(acc, spend, b.id);
          setLoyaltyTxns((t) => [txn, ...t]);
          return prev.some((a) => a.customerId === b.customerId)
            ? prev.map((a) => (a.customerId === b.customerId ? account : a))
            : [...prev, account];
        });
      }

      pushAudit("Đổi trạng thái đặt phòng", b.code, status);
      return { ok: true, message: "Đã cập nhật." };
    },
    [bookings, bookingTotalOf, pushAudit],
  );

  const cancelBooking = useCallback<StoreValue["cancelBooking"]>(
    (id, reason) => {
      const b = bookings.find((x) => x.id === id);
      if (!b) return { ok: false, message: "Không tìm thấy đặt phòng." };
      setBookings((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, status: "cancelled", cancelReason: reason, version: nextVersion(x.version) } : x,
        ),
      );
      setRooms((prev) => prev.map((r) => (r.id === b.roomId ? { ...r, status: "available" } : r)));
      pushAudit("Hủy đặt phòng", b.code, reason);
      return { ok: true, message: `Đã hủy ${b.code}.` };
    },
    [bookings, pushAudit],
  );

  const markNoShow = useCallback(
    (id: string) => {
      setBookings((prev) =>
        prev.map((x) =>
          x.id === id
            ? { ...x, noShow: true, status: "cancelled", cancelReason: "Khách không đến (no-show)", version: nextVersion(x.version) }
            : x,
        ),
      );
      pushAudit("Đánh dấu no-show", id);
    },
    [pushAudit],
  );

  /** Check-in nhanh: lưu thông tin giấy tờ đã xác nhận vào hồ sơ khách. */
  const checkInWithDocument = useCallback<StoreValue["checkInWithDocument"]>(
    (bookingId, doc) => {
      const b = bookings.find((x) => x.id === bookingId);
      if (!b) return { ok: false, message: "Không tìm thấy đặt phòng." };
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === b.customerId
            ? {
                ...c,
                name: doc.fullName || c.name,
                idNumber: doc.idNumber || c.idNumber,
                dob: doc.dob ?? c.dob,
                address: doc.address ?? c.address,
                nationality: doc.nationality ?? c.nationality,
              }
            : c,
        ),
      );
      const res = updateBookingStatus(bookingId, "checked_in");
      pushAudit("Check-in có quét giấy tờ", b.code, `${doc.docType} · độ tin cậy ${Math.round(doc.confidence * 100)}%`);
      return res.ok ? { ok: true, message: `Đã nhận phòng cho ${doc.fullName}.` } : res;
    },
    [bookings, updateBookingStatus, pushAudit],
  );

  const addServiceToBooking = useCallback<StoreValue["addServiceToBooking"]>((bookingId, svc) => {
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, services: [...b.services, svc] } : b)));
  }, []);

  const removeServiceFromBooking = useCallback<StoreValue["removeServiceFromBooking"]>((bookingId, index) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, services: b.services.filter((_, i) => i !== index) } : b)),
    );
  }, []);

  /* ------------------------------------------------- HÓA ĐƠN ------------*/

  const ensureInvoice = useCallback<StoreValue["ensureInvoice"]>(
    (bookingId) => {
      const existing = invoices.find((i) => i.bookingId === bookingId);
      const b = bookings.find((x) => x.id === bookingId)!;
      const roomTotal = b.nightlyRates?.length
        ? b.nightlyRates.reduce((s, n) => s + n.price, 0)
        : nightsBetween(b.checkIn, b.checkOut) * b.roomPricePerNight;
      const serviceTotal = b.services.reduce((s, x) => s + x.price * x.qty, 0);
      const total = roomTotal + serviceTotal;

      if (existing) {
        const net = total - existing.discount;
        const updated: Invoice = {
          ...existing,
          roomTotal,
          serviceTotal,
          total: net,
          status: existing.paid >= net ? "paid" : existing.paid > 0 ? "partial" : "unpaid",
        };
        setInvoices((prev) => prev.map((i) => (i.id === existing.id ? updated : i)));
        return updated;
      }

      // Cọc đã trả được tính là đã thanh toán
      const prepaid = paidTotal(payments, bookingId) || (b.depositPaid ? (b.depositAmount ?? 0) : 0);
      const inv: Invoice = {
        id: uid("inv"),
        code: b.code.replace("BK", "HD"),
        bookingId,
        issuedAt: new Date().toISOString(),
        roomTotal,
        serviceTotal,
        discount: 0,
        total,
        paid: Math.min(prepaid, total),
        status: prepaid >= total ? "paid" : prepaid > 0 ? "partial" : "unpaid",
        taxRate: VAT_RATE,
      };
      setInvoices((prev) => [...prev, inv]);
      return inv;
    },
    [invoices, bookings, payments],
  );

  const recordPayment = useCallback<StoreValue["recordPayment"]>((invoiceId, amount) => {
    setInvoices((prev) =>
      prev.map((i) => {
        if (i.id !== invoiceId) return i;
        const paid = Math.min(i.total, i.paid + amount);
        return { ...i, paid, status: paid >= i.total ? "paid" : paid > 0 ? "partial" : "unpaid" };
      }),
    );
  }, []);

  const issueEInvoice = useCallback<StoreValue["issueEInvoice"]>(
    (invoiceId) => {
      const inv = invoices.find((i) => i.id === invoiceId);
      if (!inv) return null;
      if (inv.eInvoiceNo) return inv;
      const issued = invoices.filter((i) => i.eInvoiceNo).length;
      const updated: Invoice = {
        ...inv,
        eInvoiceNo: nextEInvoiceNo(issued),
        eInvoiceIssuedAt: new Date().toISOString(),
        taxRate: inv.taxRate ?? VAT_RATE,
      };
      setInvoices((prev) => prev.map((i) => (i.id === invoiceId ? updated : i)));
      const { net, vat } = splitVat(inv.total, updated.taxRate);
      pushAudit("Phát hành hóa đơn điện tử", updated.eInvoiceNo, `Chưa VAT ${net} + VAT ${vat}`);
      return updated;
    },
    [invoices, pushAudit],
  );

  /* ------------------------------------------------- THANH TOÁN ---------*/

  const startPayment = useCallback<StoreValue["startPayment"]>(
    async ({ bookingId, method, purpose, amount, invoiceId }) => {
      const b = bookings.find((x) => x.id === bookingId);
      if (!b) return { ok: false, message: "Không tìm thấy đặt phòng." };
      if (amount <= 0) return { ok: false, message: "Số tiền không hợp lệ." };

      const p = await createPayment(method, {
        bookingId,
        amount,
        purpose,
        invoiceId,
        description: `${b.code} — ${purpose}`,
        customerContact: customer(b.customerId)?.email,
        recordedBy: currentUser?.name,
      });

      setPayments((prev) => [p, ...prev]);
      pushAudit("Tạo giao dịch thanh toán", b.code, `${method} ${amount} — ${p.state}`);

      if (p.state === "failed") return { ok: false, message: p.failureReason ?? "Giao dịch thất bại.", payment: p };
      return {
        ok: true,
        message: p.state === "succeeded" ? "Đã thu tiền thành công." : "Đã tạo giao dịch, chờ khách xác nhận.",
        payment: p,
      };
    },
    [bookings, customer, currentUser, pushAudit],
  );

  const settlePayment = useCallback<StoreValue["settlePayment"]>(
    (paymentId, succeeded, reason) => {
      const p = payments.find((x) => x.id === paymentId);
      if (!p) return;
      const updated = confirmGatewayPayment(p, succeeded, reason);
      setPayments((prev) => prev.map((x) => (x.id === paymentId ? updated : x)));

      if (succeeded) {
        if (updated.purpose === "deposit") {
          setBookings((prev) =>
            prev.map((b) =>
              b.id === updated.bookingId
                ? {
                    ...b,
                    depositPercent: b.depositPercent ?? DEPOSIT_PERCENT,
                    depositAmount: updated.amount,
                    depositPaid: true,
                    depositPaidAt: new Date().toISOString(),
                    version: nextVersion(b.version),
                  }
                : b,
            ),
          );
        }
        if (updated.invoiceId) recordPayment(updated.invoiceId, updated.amount);
      }
      pushAudit(succeeded ? "Xác nhận thanh toán" : "Thanh toán thất bại", updated.gatewayRef, reason);
    },
    [payments, recordPayment, pushAudit],
  );

  const refundOne = useCallback<StoreValue["refundOne"]>(
    async (paymentId) => {
      const p = payments.find((x) => x.id === paymentId);
      if (!p) return { ok: false, message: "Không tìm thấy giao dịch." };
      if (p.state !== "succeeded") return { ok: false, message: "Chỉ hoàn được giao dịch đã thành công." };
      if (!hasPermission(currentUser, "refund"))
        return { ok: false, message: "Bạn không có quyền hoàn tiền. Vui lòng liên hệ kế toán." };
      try {
        const refunded = await refundPayment(p);
        setPayments((prev) => prev.map((x) => (x.id === paymentId ? refunded : x)));
        pushAudit("Hoàn tiền", p.gatewayRef, String(p.amount));
        return { ok: true, message: "Đã hoàn tiền." };
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Hoàn tiền thất bại." };
      }
    },
    [payments, currentUser, pushAudit],
  );

  /** Đánh dấu đã cọc thủ công (lễ tân thu tiền mặt / đã nhận chuyển khoản). */
  const payDeposit = useCallback(
    (bookingId: string) => {
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId || b.depositPaid) return b;
          const roomTotal = b.nightlyRates?.length
            ? b.nightlyRates.reduce((s, n) => s + n.price, 0)
            : nightsBetween(b.checkIn, b.checkOut) * b.roomPricePerNight;
          const total = roomTotal + b.services.reduce((s, x) => s + x.price * x.qty, 0);
          return {
            ...b,
            depositPercent: DEPOSIT_PERCENT,
            depositAmount: Math.round(total * DEPOSIT_PERCENT),
            depositPaid: true,
            depositPaidAt: new Date().toISOString(),
            version: nextVersion(b.version),
          };
        }),
      );
      pushAudit("Ghi nhận tiền cọc", bookingId);
    },
    [pushAudit],
  );

  const payDepositWithGateway = useCallback<StoreValue["payDepositWithGateway"]>(
    async (bookingId, method) => {
      if (!DEMO_PAYMENTS) return { ok: false, message: "Chưa kết nối cổng thanh toán thật. Vui lòng liên hệ lễ tân." };
      const b = bookings.find((x) => x.id === bookingId);
      if (!b) return { ok: false, message: "Không tìm thấy đặt phòng." };
      if (b.depositPaid) return { ok: true, message: "Khoản cọc đã được ghi nhận." };
      if (b.status === "cancelled" || b.status === "checked_out") return { ok: false, message: "Không thể cọc cho đặt phòng đã đóng." };
      const conflict = findConflict(b.roomId, b.checkIn, b.checkOut, b.id);
      if (conflict) return { ok: false, message: "Phòng không còn trống. Vui lòng liên hệ lễ tân trước khi cọc." };
      const amount = b.depositAmount ?? Math.round(bookingTotalOf(b) * DEPOSIT_PERCENT);
      const res = await startPayment({ bookingId, method, purpose: "deposit", amount });
      if (!res.ok || !res.payment) return { ok: false, message: res.message };

      // Demo only. Use the returned record: settlePayment's closure predates setPayments.
      const updated = confirmGatewayPayment(res.payment, true);
      setPayments((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      setBookings((prev) => prev.map((item) => item.id === b.id ? {
        ...item, depositPaid: true, depositPaidAt: updated.completedAt,
        depositAmount: amount, version: nextVersion(item.version),
      } : item));
      pushAudit("Mô phỏng đặt cọc", b.code, method);
      return { ok: true, message: `Mô phỏng nhận cọc ${amount.toLocaleString("vi-VN")}đ. Không có giao dịch tiền thật.` };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookings, bookingTotalOf, startPayment, findConflict, pushAudit],
  );

  /* --------------------------------------------------- LOYALTY -----------*/

  const loyaltyOf = useCallback(
    (customerId: string) => loyaltyAccounts.find((a) => a.customerId === customerId) ?? emptyAccount(customerId),
    [loyaltyAccounts],
  );

  const redeemLoyalty = useCallback<StoreValue["redeemLoyalty"]>(
    (customerId, points, invoiceId) => {
      const inv = invoices.find((i) => i.id === invoiceId);
      if (!inv) return { ok: false, message: "Không tìm thấy hóa đơn." };
      const acc = loyaltyOf(customerId);
      const res = redeemPoints(acc, points, inv.total, inv.bookingId);
      if (!res.ok) return { ok: false, message: res.message };

      setLoyaltyAccounts((prev) =>
        prev.some((a) => a.customerId === customerId)
          ? prev.map((a) => (a.customerId === customerId ? res.account : a))
          : [...prev, res.account],
      );
      setLoyaltyTxns((prev) => [res.txn, ...prev]);
      setInvoices((prev) =>
        prev.map((i) => {
          if (i.id !== invoiceId) return i;
          const discount = i.discount + res.discount;
          const total = i.roomTotal + i.serviceTotal - discount;
          return {
            ...i,
            discount,
            total,
            pointsRedeemed: (i.pointsRedeemed ?? 0) + points,
            status: i.paid >= total ? "paid" : i.paid > 0 ? "partial" : "unpaid",
          };
        }),
      );
      pushAudit("Quy đổi điểm thân thiết", customerId, `${points} điểm → ${res.discount}đ`);
      return { ok: true, message: `Đã giảm ${res.discount.toLocaleString("vi-VN")}đ từ ${points} điểm.` };
    },
    [invoices, loyaltyOf, pushAudit],
  );

  /* ------------------------------------------------- THÔNG BÁO -----------*/

  const sendBookingNotification = useCallback(
    async (bookingId: string, kind: NotificationKind, channel: NotificationChannel = "email") => {
      const b = bookings.find((x) => x.id === bookingId);
      if (!b) return;
      const c = customers.find((x) => x.id === b.customerId);
      if (!c) return;
      const rt = roomTypes.find((t) => t.id === rooms.find((r) => r.id === b.roomId)?.typeId);

      const message = renderTemplate(kind, {
        hotelName: HOTEL_NAME,
        booking: b,
        customer: c,
        roomLabel: roomLabel(b.roomId),
        roomTypeName: rt?.name ?? "",
        total: bookingTotalOf(b),
        hotline: HOTEL_HOTLINE,
      });

      const to = channel === "sms" ? c.phone : c.email;
      const log = await sendNotification({ channel, kind, to, message, bookingId });
      setNotifications((prev) => [log, ...prev].slice(0, 300));
    },
    [bookings, customers, roomTypes, rooms, roomLabel, bookingTotalOf],
  );

  const notify = useCallback<StoreValue["notify"]>(
    (bookingId, kind, channel = "email") => sendBookingNotification(bookingId, kind, channel),
    [sendBookingNotification],
  );

  const runDueNotifications = useCallback(async () => {
    const due = dueNotifications(bookings, notifications);
    for (const d of due) await sendBookingNotification(d.bookingId, d.kind);
    if (due.length) pushAudit("Gửi thông báo tự động", undefined, `${due.length} thông báo`);
    return due.length;
  }, [bookings, notifications, sendBookingNotification, pushAudit]);

  const retryFailedNotifications = useCallback(async () => {
    const updated = await retryFailed(notifications);
    setNotifications(updated);
  }, [notifications]);

  /* -------------------------------------------------- ĐÁNH GIÁ -----------*/

  const addReview = useCallback<StoreValue["addReview"]>(
    (r) => {
      const analysis = analyzeSentiment(r.text, r.rating);
      const review: Review = {
        ...r,
        id: uid("rv"),
        createdAt: new Date().toISOString(),
        sentiment: analysis.sentiment,
        topics: analysis.topics,
        sentimentConfidence: analysis.confidence,
      };
      setReviews((prev) => [review, ...prev]);
      pushAudit("Thêm đánh giá", review.id, `${r.rating}★ ${analysis.sentiment}`);
    },
    [pushAudit],
  );

  const replyToReview = useCallback((id: string) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, replied: true } : r)));
  }, []);

  const overrideSentiment = useCallback<StoreValue["overrideSentiment"]>(
    (id, sentiment) => {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, sentiment, sentimentOverriddenBy: currentUser?.name ?? "Nhân viên" } : r,
        ),
      );
      pushAudit("Sửa nhãn cảm xúc AI", id, sentiment);
    },
    [currentUser, pushAudit],
  );

  /* --------------------------------------------------- KÊNH OTA ----------*/

  const saveChannel = useCallback(
    (c: ChannelAccount) => {
      setChannels((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c]));
      pushAudit("Cập nhật kênh bán", c.id, c.name);
    },
    [pushAudit],
  );

  const syncChannel = useCallback(
    (id: string) => {
      setChannels((prev) =>
        prev.map((c) => (c.id === id ? { ...c, lastSyncAt: new Date().toISOString(), connected: true } : c)),
      );
      pushAudit("Đồng bộ kênh bán", id);
    },
    [pushAudit],
  );

  /* -------------------------------------------------- VẬN HÀNH -----------*/

  const backupNow = useCallback(() => {
    exportBackup<PersistedState>({
      currentUser, users, roomTypes, rooms, customers, services, bookings, invoices,
      holds, payments, loyaltyAccounts, loyaltyTxns, notifications, reviews,
      ratePlans, priceOverrides, localEvents, channels, auditLog,
    });
    pushAudit("Xuất bản sao lưu");
  }, [
    currentUser, users, roomTypes, rooms, customers, services, bookings, invoices, holds, payments,
    loyaltyAccounts, loyaltyTxns, notifications, reviews, ratePlans, priceOverrides,
    localEvents, channels, auditLog, pushAudit,
  ]);

  const restoreFromFile = useCallback<StoreValue["restoreFromFile"]>(
    async (file) => {
      try {
        const data = await importBackup<PersistedState>(file);
        setUsers(data.users ?? seedUsers);
        setRoomTypes(data.roomTypes ?? seedRoomTypes);
        setRooms(data.rooms ?? seedRooms);
        setCustomers(data.customers ?? seedCustomers);
        setBookings(data.bookings ?? seedBookings);
        setInvoices(data.invoices ?? seedInvoices);
        setHolds(data.holds ?? []);
        setPayments(data.payments ?? []);
        setLoyaltyAccounts(data.loyaltyAccounts ?? seedLoyaltyAccounts);
        setLoyaltyTxns(data.loyaltyTxns ?? []);
        setNotifications(data.notifications ?? []);
        setReviews(data.reviews ?? seedReviews);
        setRatePlans(data.ratePlans ?? seedRatePlans);
        setPriceOverrides(data.priceOverrides ?? seedPriceOverrides);
        setLocalEvents(data.localEvents ?? seedLocalEvents);
        setChannels(data.channels ?? seedChannels);
        setAuditLog(data.auditLog ?? []);
        pushAudit("Phục hồi dữ liệu từ bản sao lưu", file.name);
        return { ok: true, message: "Đã phục hồi dữ liệu từ bản sao lưu." };
      } catch (err) {
        logger.error("ops", "Phục hồi thất bại", err);
        return { ok: false, message: err instanceof Error ? err.message : "Tệp sao lưu không hợp lệ." };
      }
    },
    [pushAudit],
  );

  const resetAll = useCallback(() => {
    clearState();
    setUsers(seedUsers);
    setRoomTypes(seedRoomTypes);
    setRooms(seedRooms);
    setCustomers(seedCustomers);
    setBookings(seedBookings);
    setInvoices(seedInvoices);
    setHolds([]);
    setPayments([]);
    setLoyaltyAccounts(seedLoyaltyAccounts);
    setLoyaltyTxns([]);
    setNotifications([]);
    setReviews(seedReviews);
    setRatePlans(seedRatePlans);
    setPriceOverrides(seedPriceOverrides);
    setLocalEvents(seedLocalEvents);
    setChannels(seedChannels);
    setAuditLog([]);
    logger.warn("ops", "Đã đặt lại toàn bộ dữ liệu về mẫu");
  }, []);

  const storageInfo = useCallback(
    () => ({ available: isPersistenceAvailable(), savedAt: lastSavedAt() }),
    [],
  );

  /* ------------------------------------------------------- VALUE ---------*/

  const value: StoreValue = useMemo(
    () => ({
      currentUser, users, roomTypes, rooms, customers, bookings, services, invoices,
      holds, payments, loyaltyAccounts, loyaltyTxns, notifications, reviews,
      ratePlans, priceOverrides, localEvents, channels, auditLog, sessionId,

      login, logout, registerGuest, can, updateProfile,
      saveRoom, deleteRoom, saveRoomType, saveService, deleteService, saveCustomer,

      findConflict, getAvailableRooms, createBooking, createBookingSafe,
      approveBooking, rejectBooking, reassignBooking, updateBookingStatus, cancelBooking, markNoShow,
      checkInWithDocument, addServiceToBooking, removeServiceFromBooking,

      holdRoom, dropHold, dropMyHolds, myActiveHolds, blockedRoomIds,

      quoteFor, activeRatePlan, saveRatePlan, setActiveRatePlan,
      addPriceOverride, removePriceOverride, saveLocalEvent, deleteLocalEvent,

      ensureInvoice, recordPayment, issueEInvoice, bookingTotalOf, amountPaid,
      startPayment, settlePayment, refundOne, payDeposit, payDepositWithGateway,

      loyaltyOf, redeemLoyalty,
      notify, runDueNotifications, retryFailedNotifications,
      addReview, replyToReview, overrideSentiment,
      saveChannel, syncChannel,
      pushAudit, backupNow, restoreFromFile, resetAll, storageInfo,

      roomType, roomLabel, customer, booking,
    }),
    [
      currentUser, users, roomTypes, rooms, customers, bookings, services, invoices,
      holds, payments, loyaltyAccounts, loyaltyTxns, notifications, reviews,
      ratePlans, priceOverrides, localEvents, channels, auditLog, sessionId,
      login, logout, registerGuest, can, updateProfile, saveRoom, deleteRoom, saveRoomType, saveService, deleteService, saveCustomer,
      findConflict, getAvailableRooms, createBooking, createBookingSafe, approveBooking,
      rejectBooking, reassignBooking, updateBookingStatus, cancelBooking, markNoShow, checkInWithDocument,
      addServiceToBooking, removeServiceFromBooking, holdRoom, dropHold, dropMyHolds,
      myActiveHolds, blockedRoomIds, quoteFor, activeRatePlan, saveRatePlan, setActiveRatePlan,
      addPriceOverride, removePriceOverride, saveLocalEvent, deleteLocalEvent,
      ensureInvoice, recordPayment, issueEInvoice, bookingTotalOf, amountPaid,
      startPayment, settlePayment, refundOne, payDeposit, payDepositWithGateway,
      loyaltyOf, redeemLoyalty, notify, runDueNotifications, retryFailedNotifications,
      addReview, replyToReview, overrideSentiment, saveChannel, syncChannel,
      pushAudit, backupNow, restoreFromFile, resetAll, storageInfo,
      roomType, roomLabel, customer, booking,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Quản trị viên",
  manager: "Quản lý",
  reception: "Lễ tân",
  accountant: "Kế toán",
  guest: "Khách",
};

/** Tiện ích dùng ngoài component (ví dụ trong test). */
export { maxRedeemablePoints, addDays, toISODate };

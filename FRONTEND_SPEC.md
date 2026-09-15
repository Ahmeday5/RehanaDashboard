# Rehana Dashboard — Angular Rebuild Frontend Specification

Source analyzed: `F:\Dashboards\lib\lib\` (Flutter/Dart, package `rehana_dashboared`), 228 `.dart` files. This document is a faithful, source-verified specification of the current Flutter web dashboard's behavior, plus an opinionated Angular architecture proposal. Every endpoint, Firestore path, hex color, regex, and screen count below was verified by opening the cited file. Nothing here modifies the Flutter source — this file is the only artifact produced by this research.

The two backends do not change:
- **REST API** (.NET): `http://78.89.159.126:9393/TheOneAPIRehana/api` — plain HTTP, not HTTPS.
- **Firebase Firestore** (chat only): project `rehana-dc092`.

---

## 1. Overview & architecture

### 1.1 Current architecture (Flutter)

- Single Flutter web app, hard-locked to Arabic (`main.dart:76-77`: `locale: const Locale('ar')`, `supportedLocales: const [Locale('ar')]`).
- State management: `flutter_bloc` — 13 feature Cubits/Blocs, each with its own hand-rolled State hierarchy (see Section 8), plus one Chat sub-feature that uses a shared generic `BaseState<T>` (`core/bloc/base_state.dart`) — the one place in the codebase that already does what Section 1.3 recommends doing everywhere.
- Navigation: only 4 real named routes exist (`core/utils/route/approutes.dart:10-13`: `/login`, `/splash`, `/home`, `/forget_password`). Everything else is a single shell (`SidebarMenu`, `feature/bar_navigation/presentation/screen/custom_column_slider.dart`) that swaps a body widget based on an in-memory `selectedMainIndex`/`selectedSubIndex` pair held in `BottomCubit` (`feature/bar_navigation/manger/bar_cubit.dart`). There is no URL-based deep linking to any screen except login/splash/home/forgot-password.
- Local persistence: **two** parallel SharedPreferences wrapper classes (`CacheManager` and `CacheHelper`, both in `core/utils/Network/local/`), a fully commented-out `SecureStorageService`, and a separate Hive-based `HiveCrudManager` — none of which are unified.
- Design tokens: fragmented across `core/utils/colors/colors.dart`, hardcoded hex literals inline in `core/widgets/*`, and more hardcoded hex literals inline in individual screen files (full detail in Section 5 and the duplication map in 1.4).
- Two parallel "shared widget" libraries exist side by side: `core/const/widget/*` (uses `Appcolors`, `AppStyles` responsive text) and `core/widgets/*` (uses hardcoded hex, fixed font sizes) — including two different `CustomButton` classes.

### 1.2 Proposed Angular stack

- **Angular, standalone components only** — no NgModules anywhere except the root bootstrap config. Routing via the Angular Router (this alone fixes the "no URL-based routing" issue flagged in Section 10 — every screen gets a real, bookmarkable, back-button-safe route).
- **HttpClient + functional interceptors** for: auth header injection, `Accept-Language: ar` injection, a single GET response cache (mirroring but fixing the current 30-minute Dio cache — see Section 2), centralized error mapping (400/401/404/500 → one place, not duplicated per-repo as it is today in `collections_repo_impl.dart` and `users_management_repo_impl.dart`), and a real 401 → refresh-or-redirect-to-login flow (absent today).
- **`@angular/fire`** (`AngularFireModule`/modular SDK) for Firestore chat — `collectionData()`/`docData()` with injected `Firestore` for the three realtime streams identified in Section 4, and `writeBatch()` to replace the current 4 non-atomic writes.
- **State management: Angular signals**, one lightweight feature-scoped service per domain (see 1.3) — chosen explicitly over NgRx because the current app has no cross-cutting global state beyond "logged in or not" and per-screen list/loading/error state; NgRx's boilerplate would re-introduce the same per-feature duplication (13 near-identical Cubit+State pairs) this rebuild is meant to eliminate.
- **Reactive Forms** (`FormGroup`/`FormBuilder`) everywhere a Flutter screen currently uses `TextFormField` + a hand-written validator function — this also structurally eliminates the "`TextEditingController` created inside `build()`" bug class found in three Flutter files (Section 10).

### 1.3 State management pattern (single, consolidated choice)

One pattern for every feature, no exceptions:

```ts
// shared/data/request-state.ts
export type RequestStatus = 'idle' | 'loading' | 'loadingMore' | 'success' | 'error';

export interface RequestState<T> {
  status: RequestStatus;
  data: T | null;
  items: T[];          // for list endpoints
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  errorMessage: string | null;
}
```

Every feature gets exactly one `@Injectable({providedIn: 'root'})` (or route-scoped) signal-based service that exposes a `signal<RequestState<T>>(...)`, plus plain methods (`load()`, `create()`, `update()`, `delete()`, `search(filters)`) that call the one shared `ApiService`/`HttpClient` and update the signal. This is a direct, deliberate generalization of `core/bloc/base_state.dart`'s `BaseState<T>`/`Status` enum — the only place in the current Flutter app that already avoids per-feature duplication — applied consistently instead of only in Chat. It replaces, one-for-one, all 13 Cubit+State pairs inventoried in Section 8 (e.g. `PersonState`'s 20 hand-written subclasses collapse into one `RequestState<Bond>` / `RequestState<Person>` signal each).

### 1.4 Proposed folder structure

```
src/app/
  core/                        # singletons, no UI
    api/
      api.service.ts           # one HttpClient wrapper (get/post/put/delete), base URL, one place
      http-error.interceptor.ts
      auth.interceptor.ts      # Bearer header + Accept-Language: ar
      cache.interceptor.ts     # GET cache (replaces Dio's 30-min MemCacheStore)
      response-cache.service.ts
    auth/
      session.service.ts       # token/role storage, session validity, 401 → logout/redirect
      auth.guard.ts            # functional route guard (CanActivateFn)
    firebase/
      firestore-chat.service.ts # all Firestore reads/writes for chat, writeBatch() sends
    config/
      design-tokens.ts         # ONE source for color/spacing/breakpoint/font constants
      app.config.ts            # environment, base URL, VAPID key, firebase config
  shared/                      # dumb, reusable UI — no feature knowledge
    components/
      button/                  # ONE Button component (replaces 2 CustomButton classes)
      data-table/              # ONE table shell: header-cell + data-cell + status-cell
      pagination/              # ONE pagination component (page/pageSize/total)
      form-field/              # ONE labeled input wrapper (replaces Textformcrud/CustomTextField)
      dropdown/                # ONE dropdown wrapper (replaces 3 dropdown implementations)
      skeleton-loader/         # ONE shimmer/skeleton component
      snack-bar/                # ONE toast/snackbar service+component
      empty-state/             # ONE "no data" component (currently missing app-wide)
      confirm-dialog/          # ONE delete-confirmation dialog (currently missing app-wide)
    directives/
      rtl-override.directive.ts # explicit, auditable LTR-forcing (replaces ad hoc Directionality)
    pipes/
  layout/
    shell/                     # the authenticated app shell (sidebar + router-outlet)
    sidebar/                   # ONE sidebar, driven by a declarative route/menu config, not a switch
  features/
    auth/                      # login, forgot-password, reset-password
    owners/                    # add owner + all owners (villa residents)
    security-guards/           # add + view security guards
    system-users/              # add user / view users (admin/account-manager accounts)
    accounts/                  # receipt & disbursement vouchers, bulk disbursement
    collections/               # مقبوضات
    bonds/                     # compound disbursement bond, bonds summary by year
    invitations/               # Home (all invitations) + create-invite (Phase 2)
    chat/                      # contacts list + conversation view
  app.routes.ts                # single source of truth for the route tree
```

Each of the current duplication problems (Section 1.5) is designed to have **exactly one canonical home** in this tree — there is deliberately no second `core/widgets/`-style folder.

### 1.5 Duplication map (Flutter duplication found → single Angular home)

*(Compiled last, after full research across Sections 3, 5, 7, 8, 10 — grounded in what was actually found, not assumed.)*

| # | Flutter duplication found | Evidence (file:line) | Single Angular home |
|---|---|---|---|
| 1 | Two `CustomButton` widgets with different params, defaults, and colors | `core/const/widget/custom_button.dart:1-33` (height 60, radius 10, `Appcolors.kwhite` default) vs `core/widgets/custom_button.dart:1-47` (height 50, radius 12, `0xFF9DC183` default) | `shared/components/button/button.component.ts` — one component, variant/size inputs |
| 2 | Two `OwnerModel` shapes with incompatible `villaNumber` type | `feature/add_users/data/model/ownermodel.dart` (`villaNumber: int`, `pictureUrl` nullable, has `token`, no `id`) vs `feature/UserManagement/data/model/owner_model.dart` (`villaNumber: String`, `pictureUrl` non-nullable, has `id`, no `token`) | One `Owner` interface in `features/owners/data/owner.model.ts`, `villaNumber: number`, normalized at the API boundary |
| 3 | Two `UserModel` shapes | `feature/Auth/data/model/login_model.dart` `UserModel` (`token`, no `id`) vs `feature/users_management/data/models/user_model.dart` `UserModel` (`id`, no `token`, plus `getRolesInArabic()`) | One `AuthUser`/`SystemUser` split in `core/auth/` and `features/system-users/data/` — `token` never lives on a display model |
| 4 | Two/five "primary green" hex values | `colors.dart` `kprimary`=`#ABBD66` vs `kprimary1`=`#99B336`; plus `core/widgets/custom_button.dart:31` `#9DC183`; `buildsidebar.dart:27` `#AECB70`; `status_cell.dart:26` `#B5CC6D` | `core/config/design-tokens.ts` — one `--color-primary` CSS variable; a design decision is required on which shade wins (flagged, not silently resolved) |
| 5 | Two breakpoint systems (800/1200 vs ad hoc) | `SizeConfig.tablet=800/desktop=1200` (`size_config.dart:2-3`) = `ResponsiveBuilder` default 800 (`responsive_builder.dart:11`) = `custom_column_slider.dart:24-25` (`isMobile <800`, `isComputer >=1200`) — internally consistent, but every `*_responsive.dart` screen re-implements its own `LayoutBuilder`/`MediaQuery` check rather than sharing one utility | `core/config/design-tokens.ts` breakpoints (`mobile: 800`, `desktop: 1200`) + one `BreakpointService`/CSS container queries — no screen re-derives its own threshold |
| 6 | Three dropdown implementations | `core/const/dropdownformcrud.dart`, `core/const/widget/custom_drop_down_menu.dart` (near-duplicate, no validator support), plus ad hoc `DropdownButtonFormField` in several screens | `shared/components/dropdown/dropdown.component.ts` |
| 7 | Ad hoc `TextEditingController()` instantiated inside `build()` (state-loss bug) | `add_account_mangment_responsive.dart:13-18`; `UserManagement/.../owner_edit_alert_dialog.dart:19-31` (10 controllers); `security_view/.../security_show_alert_dialoug.dart:19-26` | Reactive Forms (`FormGroup`) built once in a component's constructor/`ngOnInit`, never in a template-evaluated context — structurally impossible to reintroduce this bug |
| 8 | 13 hand-written Cubit+State pairs, most an Initial/Loading/Success/Failure clone of each other (see Section 8) — Chat alone already generalized this via `BaseState<T>` | `core/bloc/base_state.dart` (the good example) vs `person_state.dart` (20 bespoke classes), `user_state.dart` (14), `adduser_state.dart` (12), etc. | `shared/data/request-state.ts` (`RequestState<T>` + `RequestStatus`) — Section 1.3 |
| 9 | Two SharedPreferences wrapper classes + one dead, fully-commented-out `SecureStorageService` + a separate Hive CRUD layer | `CacheManager` + `CacheHelper` both initialized in `main.dart:27,34`; `flutter_secure_storage.dart` entirely commented out; `hive_crud_manager.dart` | `core/auth/session.service.ts` (token/role) + browser `localStorage`/`sessionStorage` behind one thin wrapper — one persistence surface, not four |
| 10 | Duplicated 400/401/404/500 → Arabic-message mapping copy-pasted per repo | `collections_repo_impl.dart:56-71` and `users_management_repo_impl.dart:55-61+`, identical switch statements | `core/api/http-error.interceptor.ts` — one mapping table, used by every request |
| 11 | Avatar/picture URL constructed two different ways for conceptually the same "user picture" concern | Owners: hardcoded `"http://78.89.159.126:9393/TheOneAPIRehana" + pictureUrl` (`all_owners_tablet.dart:106`, `owner_card_mobile.dart:46`) vs Security guards: `pictureUrl` used as-is (`security_view_tablet.dart:146`) | One `resolveAssetUrl(pictureUrl)` helper in `core/api/`, deriving the media-base from the same environment config as `apiBaseUrl`, applied uniformly to every avatar |
| 12 | Two owner/user CRUD feature folders that look like duplicates but are not | `feature/UserManagement` (villa-resident owners, full CRUD) vs `feature/users_management` (system/admin accounts, add+list only) — confirmed distinct by sidebar wiring, `bar_cubit.dart:116-133` | Kept as two Angular features (`features/owners/`, `features/system-users/`) sharing the same `shared/components/data-table` and `RequestState<T>` base — distinct domains, zero duplicated plumbing |
| 13 | `memberReceipt` endpoint called with two structurally different payloads under two different constant names | `EndPoint.createBondForMember` and `EndPoint.createCollection` both `= "$baseUrl/Dashboard/memberReceipt"` (`endpoint.dart:33,55`) | One `BondsApiService.createMemberReceipt(payload: ReceiptPayload | CollectionPayload)` with a discriminated-union TS type documenting both shapes explicitly, instead of two same-named-URL constants pretending to be different endpoints |

---

## 2. Transport layer

- **Base URL** (`core/utils/api/endpoint.dart:2`): `http://78.89.159.126:9393/TheOneAPIRehana/api` — plain HTTP. **Flag: not HTTPS.**
- **Headers**, set two ways:
  - Dio-instance default (`core/utils/api/dio_consumer.dart:14-16`): `dio.options.headers = {'Accept-Language': 'ar'};`
  - Per-request (`dio_consumer.dart:40-48`, `_buildHeaders`): `{'Accept-Language': 'ar', if (token != null) 'Authorization': 'Bearer $token'}`. The `withAuth` parameter accepted by every verb method is **never actually checked** — the header is added whenever a cached token exists, regardless of `withAuth`'s value (dead parameter).
  - Content-Type: GET is hardcoded `'application/json'` (`dio_consumer.dart:68`); POST/PATCH/PUT/DELETE use `isFromData ? 'multipart/form-data' : 'application/json'` (e.g. `dio_consumer.dart:97,122,147,172`).
- **Timeouts**: none configured anywhere in `dio_consumer.dart` — no `connectTimeout`/`receiveTimeout`/`sendTimeout`. **Flag: requests can hang indefinitely.** Angular interceptor should add an explicit `timeout()` operator.
- **GET response cache** (`dio_consumer.dart:18-28`):
  ```dart
  dio.interceptors.add(DioCacheInterceptor(options: CacheOptions(
    store: MemCacheStore(),
    policy: CachePolicy.request,
    maxStale: const Duration(minutes: 30),
    priority: CachePriority.high,
    keyBuilder: CacheOptions.defaultCacheKeyBuilder,
  )));
  ```
  TTL is **30 minutes** (`maxStale: const Duration(minutes: 30)`), cache key = full request URI (method + URL + query params, the package's `defaultCacheKeyBuilder`), applies to GET only, default **on** unless a caller passes `useCache: false` to `DioConsumer.get()` (`dio_consumer.dart:57`). Angular equivalent: an `HttpInterceptorFn` keyed by full URL (including query string), an in-memory `Map` with a 30-minute TTL, bypassable via an `HttpContext` token per request.
- **Token/session storage** (`core/utils/Network/local/cache_manager.dart:5-8`): keys `'token'` (`_accessTokenKey`), `'fcmToken'`, `'userId'`, `'isGuestMode'`. A separate loose string key `"role"` is read via a generic `getData(key:)` accessor (`main.dart:121`) and written at login (`auth_repo_imp.dart:51-53`: `role = model.roles.isNotEmpty ? model.roles.first : 'user'`). A second, parallel `CacheHelper` class exists purely for the (unused) localization language key. A `SecureStorageService` class is fully commented out (`flutter_secure_storage.dart`, all 48 lines).
- **Session validity check** (`main.dart:118-130`, after a fixed 3-second splash delay):
  ```dart
  final token = await CacheManager.getAccessToken();
  final role = await CacheManager().getData(key: "role");
  final nextRoute = (token != null || role != null) ? Routes.home : Routes.login;
  ```
  **This is an OR, not an AND** — a stale `role` string alone (with no token) is enough to route into the authenticated shell. No expiry/JWT decode, no refresh. **Flag as a security issue.**
- **No 401 interceptor / no auto-logout / no refresh token flow anywhere.** `handleDioExceptions` (`dio_consumer.dart:182-188`) only `debugPrint`s and rethrows. 400/401/404/500 → Arabic message mapping is duplicated per-repo (`feature/collections/data/repo/collections_repo_impl.dart:56-71`, `feature/users_management/data/repo/users_management_repo_impl.dart:55-61+`) and never triggers logout. **Angular must add a real `401 → clear session → redirect to /login` interceptor — this does not exist today.**
- **Response body shapes** — three distinct shapes exist, unvalidated by any schema:
  1. **JSON object**, parsed into a typed model (e.g. `UserModel.fromJson`, most create/update endpoints).
  2. **Bare JSON array** (no envelope) — confirmed at `getVillasList` (`/Dashboard/list`, `collections_repo_impl.dart:16-30`: `if (response is List) {...} else return left(ServerFailure("Invalid response format"))`) and `getbondssummarybyyearbyvillanumber` (`accountmangmentrepoimp.dart:249-253`, `as List<dynamic>`).
  3. **Plain text**, treated as an opaque success string via `.toString()` or literal comparison. Confirmed literal-English-string comparisons found:
     - `feature/security_view/data/repo/security_repo_imp.dart:39`: `if (response == "SecurityGuard Deleted Successfully")`
     - `feature/Account_Management/data/accountmangmentrepoimp.dart:115`: `if (response == "Member Bond Created Successfully")`
     - `feature/Account_Management/data/accountmangmentrepoimp.dart:215`: comparison against `"Owner Disbursement Bond Created Successfully"`
     - `feature/Auth/data/repo/auth_repo_imp.dart:106-107`: `if (responseMessage.trim() == "Email is Not Exist")`
     - `feature/Auth/data/repo/auth_repo_imp.dart:135`: `if (responseMessage.trim() == "Invalid or Expired Token")` (note: the mapped Arabic-facing failure message has a typo, `"TInvalid or Expired Token."`, in the same line)
     - `feature/collections/data/repo/collections_repo_impl.dart:48` / `feature/Account_Management/.../accountmangmentrepoimp.dart:305`: no literal comparison, just `response.toString()` treated as the success payload (opaque, not a typed DTO) — for `createCollection`/`bulkDisbursement`.
     
     That is **6 confirmed literal-English-string checks** across the app (5 exact-equality checks + the reset-password typo variant counted once). Angular's `ApiService` needs a response-shape discriminator per endpoint (object / array / plain-text-success-literal) rather than assuming JSON uniformly — this is a real backend contract quirk, not a client bug to silently "fix" without backend coordination.
- **Inconsistent request serialization**: most POST calls pass a raw `Map` as `data`; `resetpasswordOwner` manually `jsonEncode`s the body first (`auth_repo_imp.dart:129`) — inconsistent with every other call site. Angular's `HttpClient` should serialize uniformly; do not port this inconsistency.

---

## 3. Endpoint reference

All URLs below are `$baseUrl/...` where `baseUrl = http://78.89.159.126:9393/TheOneAPIRehana/api` (`endpoint.dart:2`). Citations point to the endpoint constant in `core/utils/api/endpoint.dart` and to the repo file that actually calls it (constants and call sites can diverge — see §3.8).

### 3.1 Auth

| Operation | Method | URL | Request body | Response | Notes |
|---|---|---|---|---|---|
| Login | POST | `/Dashboard/loginOwner` (`endpoint.dart:4`) | `{email:string, password:string, rememberMe:true (hardcoded), deviceToken:string (FCM token or '')}` (`auth_repo_imp.dart:28-36`) | `UserModel.fromJson` (`login_model.dart`): `email, userName, fullName, phoneNumber?:string, roles:string[], token:string` | On empty token: `left(ServerFailure("Missing token in response"))` (`auth_repo_imp.dart:42-44`). On success: saves `token`, `name`, and `role` = `roles.first ?? 'user'` (`auth_repo_imp.dart:47-53`). |
| Forgot password | POST | `/Dashboard/forgotpasswordOwner` (`endpoint.dart:5`) | `{email:string}` (`auth_repo_imp.dart:94-116`) | plain string | Literal check: `responseMessage.trim() == "Email is Not Exist"` → `"This email is not registered."` (`auth_repo_imp.dart:106-107`) |
| Reset password | POST | `/Dashboard/resetpasswordOwner` (`endpoint.dart:6`) | `jsonEncode({email, token, newPassword})` (`auth_repo_imp.dart:118-144`, note: manually JSON-encoded unlike every other call) | plain string | Literal check: `== "Invalid or Expired Token"` → Arabic-facing message has a typo, `"TInvalid or Expired Token."` (`auth_repo_imp.dart:135`) |

FCM token fetch (`auth_repo_imp.dart:76-87`, `_fetchFcmToken`): `FirebaseMessaging.instance.getToken(vapidKey: "BF4pFQe9Hn3uvUQvIxdcu1CKhF-B3knjSggQE30Vut-wy_YtvELbn5LCIwIP4_jMYEOVTnLgIxlxVT2nm_Poiuo")`, only called from the login flow, sent as `deviceToken` in the login body above. Not used anywhere in chat.

### 3.2 Owners — Members (villa residents)

Feature folders: `feature/add_users/` (create) + `feature/UserManagement/` (list/update/delete). These are reachable from the sidebar's **"الملاك" (Owners)** group.

| Operation | Method | URL | Request | Response | file:line |
|---|---|---|---|---|---|
| Add owner | POST, multipart | `/Dashboard/addMember` (`endpoint.dart:15`) | FormData: `name, email, password, phoneNumber, villaAddress, villaLocation, VillaNumber (string, PascalCase key), VillaSpace (string, PascalCase key), villaStreet, villaFloorsNumber:int, Image?:file` | `raw['data'] ?? raw` → `OwnerModel.fromJson` | `feature/add_users/data/repo/adduserrepoimp.dart:16-61` |
| Get all owners | GET | `/Dashboard/getAllOwners` (`endpoint.dart:47`) | — | bare `List<OwnerModel>` (UserManagement's own shape, `villaNumber:String`) | `feature/UserManagement/data/usermangmentrepoimp.dart:55` |
| Get all members | GET | `/Dashboard/getAllMembers` (`endpoint.dart:48`) | — | bare `List<OwnerModel>` | `usermangmentrepoimp.dart:90` |
| Update owner | PUT, multipart | `/Dashboard/updateMember` (`endpoint.dart:59`) | FormData: `Id:int, Email, Name, PhoneNumber, Password, VillaAddress, VillaNumber:int, VillaLocation, VillaSpace, VillaStreet, VillaFloorsNumber:int, Image?:file` | — | `usermangmentrepoimp.dart:122-145` |
| Delete owner | DELETE | `/Dashboard/deleteMember?id=` (`endpoint.dart:60`) | — | — | `usermangmentrepoimp.dart:158` |

`UserManagement`'s own `addOwner` (`usermangmentrepoimp.dart:23-34`) and `users_management` (lowercase)'s `addUser` (`users_management_repo_impl.dart:19`) **both** call `EndPoint.addOwner = "$baseUrl/Dashboard/addOwner"` (`endpoint.dart:46`) — a **third**, distinct "add owner" URL from `addMember` above, with body `{email, password, fullName, phoneNumber, roles:[role]}` — used for both the "Owners" flow (uppercase folder) and the unrelated "System users" flow (lowercase folder, §3.3). Angular should model this as one `POST /Dashboard/addOwner` operation with a body shape shared by both features, not duplicate it.

Owner avatar URL: hardcoded literal `"http://78.89.159.126:9393/TheOneAPIRehana" + pictureUrl` (base URL **minus** `/api`, not derived from the `EndPoint.baseUrl` constant) — `all_owners_tablet.dart:106`, `owner_card_mobile.dart:46`.

### 3.3 System users (admin / account-manager accounts)

Feature: `feature/users_management/` (lowercase) — reachable from the sidebar's **"إدارة المستخدمين" (User Management)** group. Distinct from §3.2 (confirmed by `bar_cubit.dart:125-133`).

| Operation | Method | URL | Request | Response | file:line |
|---|---|---|---|---|---|
| Add user | POST | `/Dashboard/addOwner` (same URL as §3.2's third variant) | `AddUserRequestModel.toJson()`: `{email, password, fullName, phoneNumber, roles:string[]}` | `UserModel` (users_management's own shape: `id, email, userName, fullName, phoneNumber:string, roles`) | `users_management_repo_impl.dart:18` |
| Get all users | GET | `/Dashboard/getAllOwners` (same URL as §3.2) | — | bare `List<UserModel>` | `users_management_repo_impl.dart:34` |

No update/delete endpoint exists in this repo at all (`users_management_repo.dart:6-9` declares only these two methods) — confirmed no delete UI/API anywhere in this feature.

### 3.4 Security guards

Feature: `feature/add_users/` (create) + `feature/security_view/` (list/update/delete).

| Operation | Method | URL | Request | Response | file:line |
|---|---|---|---|---|---|
| Add security guard | POST, multipart | `/Dashboard/addSecurityGuard` (`endpoint.dart:17`) | FormData: `UserName, Email, Password, PhoneNumber, GateNumber, Image?:file` | `SecurityGuardModel.fromJson` | `adduserrepoimp.dart:98-135` |
| Get all security guards | GET | `/Dashboard/getAllSecurityGuards` (`endpoint.dart:18`) | — | bare `List<SecurityGuardModel>` | `feature/security_view/data/repo/security_repo_imp.dart:16` |
| Update security guard | PUT, multipart | `/Dashboard/updateSecurityGuard` (`endpoint.dart:19`) | FormData: `id, password`, optional `UserName, email, phoneNumber, image, gateNumber` | `SecurityGuardModel.fromJson` | `security_repo_imp.dart:71-74` |
| Delete security guard | DELETE | `/Dashboard/deleteSecurityGuard?id=` (`endpoint.dart:20-21`) | — | plain string, literal check `== "SecurityGuard Deleted Successfully"` | `security_repo_imp.dart:38-39` |

Security guard avatar: `pictureUrl` used **as-is**, no base-URL prepending (`security_view_tablet.dart:146`, `secirtycardmobile.dart:50`, `secuirtyimage.dart:44-56`) — the opposite convention from owners (§3.2). This inconsistency is real; document both, do not silently unify without confirming with backend which is correct.

### 3.5 Member accounts (villa resident financial account)

| Operation | Method | URL | Request | Response | file:line |
|---|---|---|---|---|---|
| Create member account | POST | `/Dashboard/createMemberAccount` (`endpoint.dart:24`) | `{fullName, phoneNumber, isMarried:bool, address, date (ISO8601 string), villaNumber:int}` | `Person.fromJson` | `feature/add_users/data/repo/adduserrepoimp.dart:64-95` (screen not wired to sidebar — see §11) |
| Update member account | POST | `/Dashboard/UpdateMemberAccount` (`endpoint.dart:25`) | `{id, fullName, phoneNumber, isMarried, address, date, villaNumber}` | `Person.fromJson` | `feature/Account_Management/data/accountmangmentrepoimp.dart:68-79` |
| Delete member account | DELETE | `/Dashboard/deleteMemberAccount?id=` (`endpoint.dart:26-27`) | — | — | `accountmangmentrepoimp.dart:43-44` |
| Get all member accounts | GET | `/Dashboard/GetAllMemberAccounts?page=` (`endpoint.dart:28-29`) | query: `page, pageSize` | `PersonPageSize.fromJson`: `{items:Person[], page, pageSize, totalItems, totalPages}` | `accountmangmentrepoimp.dart:23-24` |
| Get member account by villa number | GET | `/Dashboard/getMemberAccountByVillaNumber/` (`endpoint.dart:42-43`) | path param: villa number | — | endpoint defined; not confirmed called from a screen in this pass |

`Person` fields (`person_model.dart`): `id:int, fullName:string, phoneNumber:string, isMarried:bool, address:string, date:DateTime, villaNumber:int`.

### 3.6 Bonds (receipts / disbursements / compound)

**The `memberReceipt` dual-payload endpoint** (see duplication map row 13) — same physical URL, two different logical operations:

| Caller | Method | URL | Request body | Response |
|---|---|---|---|---|
| Account Management "Create Bond" | POST | `/Dashboard/memberReceipt` (`EndPoint.createBondForMember`, `endpoint.dart:33`) | `{date:string, currency:string, amount:double, villaNumber:int, type:"Receipt"\|"Disbursement", bondDescription:string}` (`accountmangmentrepoimp.dart:103-113`) | plain string, literal check `== "Member Bond Created Successfully"` |
| Collections "Create Collection" | POST | `/Dashboard/memberReceipt` (`EndPoint.createCollection`, `endpoint.dart:55`) | `{villaNumber:string, amount:double, date:string, currency:string, bondDescription:string}` — **no `type` field, `villaNumber` is a string not an int** (`collections_repo_impl.dart:39-46`, `collection_request_model.dart:16-24`) | `response.toString()`, no structured parsing |

Other bond endpoints:

| Operation | Method | URL | Request | Response | file:line |
|---|---|---|---|---|---|
| Get receipt bonds | GET | `/Dashboard/bonds?type=Receipt&page=` (`endpoint.dart:38-39`) | query: `page, pageSize`, optional `villaNumber, memberName, fromDate, toDate` | `BondPageModel.fromJson`: `{items:BondModel[], page, pageSize, totalItems, totalPages}` | `accountmangmentrepoimp.dart:137-153` |
| Get disbursement bonds | GET | `/Dashboard/bonds?type=Disbursement&page=` (`endpoint.dart:40-41`) | same as above | same envelope shape | `accountmangmentrepoimp.dart:175-191` |
| Add compound disbursement bond | POST | `/Dashboard/addCompoundDisbursementBond` (`endpoint.dart:34-35`) | `{date:string, currency:string, amount:double}` | plain string, literal check `== "Owner Disbursement Bond Created Successfully"` | `accountmangmentrepoimp.dart:210-215` |
| Get compound disbursement bonds | GET | `/Dashboard/CompoundDisbursementBonds?page=` (`endpoint.dart:36-37`) | query: `page, pageSize` | `CompoundDisbursementBondsPageModel.fromJson`: `{items, page, pageSize, totalItems, totalPages}`; item = `{id:int, date:string, currency, ownerEmail, amount:double, ownerId:string}` | `accountmangmentrepoimp.dart:231-232` |
| Bonds summary by year by villa number | GET | `/Dashboard/GetBondsSummaryByYearByVillaNumber?villaNumber=` (`endpoint.dart:44-45`) | query: `villaNumber` | **bare array** (no envelope), item = `{year:int, totalReceipt:double, totalDisbursement:double, difference:double}` | `accountmangmentrepoimp.dart:249-253` |

`BondModel` fields (`bond_model.dart:20-30`): `date:string, currency:string, bondDescription:string, type:string, amount:double, villaNumber:string, memberName:string`.

Page size used everywhere in this feature: **20** (`person_cubit.dart:17`, `homeinvitation_cubit.dart:14`).

### 3.7 Villas / bulk disbursement

| Operation | Method | URL | Request | Response | file:line |
|---|---|---|---|---|---|
| Get villas list | GET | `/Dashboard/list` (`endpoint.dart:51`) | — | **bare array**, item → `VillaListModel`/`VillaModel`: `{villaNumber:string, memberName/ownerName:string}` | `accountmangmentrepoimp.dart:275-276`, `collections_repo_impl.dart:16-30` |
| Bulk disbursement | POST | `/Dashboard/bulkDisbursement` (`endpoint.dart:52`) | `{villaNumbers:string[], pricePerMeter:double, date:string, currency:string ("EGP" hardcoded), bondDescription:string}` | `response.toString()`, no structured parsing | `accountmangmentrepoimp.dart:294-305` |

Separate, undocumented endpoint bypassing `EndPoint`/`DioConsumer` entirely — a raw `Dio()` instance hits `http://78.89.159.126:9393/TheOneAPIRehana/api/Member/villaNumbers` directly (`feature/create_invite/presentation/manger/securityonetime_cubit.dart:93`), returns bare `List<int>`, client-cached 10 minutes via `ApiRequestMixin` (`securityonetime_cubit.dart:101`). **Flag: this endpoint is not in `endpoint.dart` at all** — the Angular `ApiService` should still register it as a first-class endpoint, not replicate the bypass.

### 3.8 Invitations (Phase 2)

| Operation | Method | URL | Request | Response | file:line |
|---|---|---|---|---|---|
| Get all invitations | GET | `/Dashboard/allInvitations?page=` (`endpoint.dart:10`) | query: `page, pageSize` | `PaginatedVisitInvitations.fromJson`: `{items:VisitInvitation[], page, pageSize, totalItems, totalPages}` | `feature/Home/data/repo/invitation_repo_imp.dart:16-24` |
| One-time invitation (Create Invite) | POST, multipart | `/Invitation/ownerOneTimeInvitation` (`endpoint.dart:11-12`) | FormData: `ReasonForVisit, DateFrom (ISO8601 UTC), DateTo (ISO8601 UTC), GuestName, GuestPhoneNumber, VillaNumber, GuestPicture?:file` | `Invitation.fromJson`: `{invitationId:string, qrCode:string, status:string, isAccepted:bool?}` | `feature/create_invite/data/repo/invitationsecurity_repo_imp.dart:17-53` |

`VisitInvitation` fields (`visitinvitation.dart:24-36`): `id:string, memberId:int, memberUserName:string, memberVillaNumber:int, status:string, dateFrom:DateTime, dateTo:DateTime, reasonForVisit:string, invitationType:string`.

### 3.9 Casing & shape inconsistencies (explicit call-out)

- Field-name casing is inconsistent **within the same conceptual object** across endpoints: `addMember`'s FormData uses `VillaNumber`/`VillaSpace` (PascalCase) while `getAllMemberAccounts`'s JSON uses `villaNumber` (camelCase) for the same concept.
- Two pagination shapes exist: the envelope `{items, page, pageSize, totalItems, totalPages}` (owners-by-page, bonds, compound bonds, invitations) vs. bare arrays with no metadata (`/Dashboard/list`, `GetBondsSummaryByYearByVillaNumber`). Angular's `ApiService` should expose two typed helper methods (`getPaged<T>()` / `getList<T>()`) rather than one generic method that guesses the shape at runtime, as the Flutter code currently does (`response is List` checks scattered per-repo).
- `villaNumber` type varies by model: `int` in `add_users/ownermodel.dart` and the Account_Management "Create Bond" payload, `String` in `UserManagement/owner_model.dart` and the Collections payload. The Angular `Owner`/`Bond` interfaces must pick one (`number`) and convert at the API boundary, documented per endpoint since the backend itself is inconsistent.

---

## 4. Real-time chat (Firestore)

Firebase project (verbatim, `firebase_options.dart:43-51`, `web` block):

```
apiKey: 'AIzaSyCbnm3X57a3JMaQtXHYglcsXFCHSUyTWMw'
appId: '1:987914961227:web:306f46d5e760a3f81568ce'
messagingSenderId: '987914961227'
projectId: 'rehana-dc092'
authDomain: 'rehana-dc092.firebaseapp.com'
storageBucket: 'rehana-dc092.firebasestorage.app'
measurementId: 'G-PBDQGE12L8'
```

VAPID key (`feature/Auth/data/repo/auth_repo_imp.dart:79-81`, the only occurrence in the codebase): `BF4pFQe9Hn3uvUQvIxdcu1CKhF-B3knjSggQE30Vut-wy_YtvELbn5LCIwIP4_jMYEOVTnLgIxlxVT2nm_Poiuo`. It is used only to fetch an FCM token at **login** (sent as `deviceToken` in the REST login body, §3.1) — it has no role in the chat feature itself.

**`web/firebase-messaging-sw.js` was not located.** The delivered source tree is `F:\Dashboards\lib\lib\` (Dart sources only, no `pubspec.yaml`, no `web/` platform folder — the extraction includes a sibling `__MACOSX/` folder, confirming this is an unzipped subset, not the full Flutter project). **This file could not be verified and its content is not documented here — it must be sourced from the actual deployed web build if a service worker is required for the Angular FCM implementation.**

### 4.1 Architecture reality check

- **No Firebase Authentication is used anywhere.** Zero occurrences of `FirebaseAuth`/`signInWith*`/`.currentUser` in the entire `lib/` tree. All Firestore access happens unauthenticated at the client SDK level; REST API auth (Bearer token) is completely separate and has no bearing on Firestore access.
- The chat feature is architected around **exactly one hardcoded operator identity**: `_myId = "admin"` (`feature/Chat/presentation/view/screen/chat_screen.dart:31-36`, comment: "As per user request, it's only one admin"), and `getContacts()` reads the literal, non-parameterized path `userConversations/admin/contacts` (`chat_repo_impl.dart:129-134`). This is not a generic multi-user chat system today — a faithful port keeps this single-admin assumption; a generic redesign would be a deliberate deviation, not a port, and should be flagged as such if pursued.

### 4.2 Collections, subcollections, and fields (verified against `feature/Chat/data/repo/chat_repo_impl.dart`, full file read)

| Path | Kind | Fields (name: type) |
|---|---|---|
| `conversations/{conversationId}` | doc | `lastMessage:string, lastMessageTime:Timestamp, lastMessageSenderId:string, members:string[]` (written `chat_repo_impl.dart:63-68,91-95`) |
| `conversations/{conversationId}/messages` | subcollection | `senderId:string, receiverId:string, content:string, timestamp:Timestamp, type:'text'\|'image'\|'file', isRead:bool` (written `chat_repo_impl.dart:55-59`; model `chat_message.dart:39-48`) |
| `userConversations/{userId}/contacts/{otherUserId}` | doc | Sender's own inbox entry (`chat_repo_impl.dart:71-79`): `id:string (=conversationId), otherUserId:string, otherUserName:string, otherUserProfilePic:string?, lastMessage:string, lastMessageTime:Timestamp, unreadCount:int (hardcoded 0)`. Receiver's inbox entry (`chat_repo_impl.dart:82-89`) has the **same shape minus `unreadCount`** — that field is never written on the receiver's side at all. |
| `userConversations/admin/contacts` | collection (hardcoded literal `"admin"`, not a variable) | read via `getContacts()`, `chat_repo_impl.dart:128-135` |
| `Users` | collection | read via `getUsers()`, defensive multi-key fallback parsing (`chat_user.dart:25-54`): id from `id`/`otherUserId`/`userId`/`uid`; name from `name`/`otherUserName`/`userName`/`fullName`; image from `image`/`otherUserProfilePic`/`profileImage`; plus `email, isOnline:bool, lastSeen:Timestamp, lastMessage:string, lastMessageTime:Timestamp` |

### 4.3 conversationId

**Confirmed: `conversationId === otherUserId`**, literally (`chat_screen.dart:75-78`):
```dart
String _getConversationId() {
  // In this app structure, the conversation ID is the user's ID
  return widget.user.id;
}
```
It is the raw ID of the other party — not a composite/deterministic key such as `sorted([uidA,uidB]).join('_')`. Given the single hardcoded `"admin"` identity (§4.1), this does not collide in current usage, but it is not a generically safe scheme for a multi-operator redesign.

### 4.4 text vs. content field asymmetry

- **Every write uses `content`** — `ChatMessage.toJson()` (`chat_message.dart:39-48`) emits key `'content'`, and `chat_repo_impl.dart:58` (`message.toJson()..addAll({'timestamp': now})`) never introduces a `text` key.
- **The read side is defensive**: `ChatMessage.fromJson` (`chat_message.dart:29`): `content: json['text'] ?? json['content'] ?? ''` — checks `text` first, then `content`. Since nothing in this codebase ever writes `text`, this fallback exists purely for compatibility with some other producer of this data (unverified) or as defensive legacy code.
- At the Bloc-event boundary, the UI-facing field is named differently again: `SendMessageEvent.text` (`feature/Chat/presentation/manager/chat_messages_event.dart:16-37`) — so the naming path is **UI event field `text` → repo method param `content` → Firestore field `content`**, with the read model tolerating both. Angular's `ChatMessage` interface should use `content` as canonical and accept `text` only as a legacy-read fallback in the Firestore converter, matching current behavior exactly.

### 4.5 Realtime streams

All three chat reads are **`.snapshots()` streams** — none use one-time `.get()` (confirmed: `FirebaseConsumer` exposes `getDocumentOnce`/`getCollectionOnce`/`getSubcollectionOnce` variants, but `chat_repo_impl.dart` never calls them):

| Stream | Collection | orderBy | direction | limit |
|---|---|---|---|---|
| Messages | `conversations/{conversationId}/messages` | `timestamp` | descending | none (unbounded) |
| Contacts | `userConversations/admin/contacts` | `lastMessageTime` | descending | none |
| Users | `Users` | `name` | ascending (default) | none |

### 4.6 Send = 4 separate non-atomic writes

Confirmed by full read of `sendMessage()` (`chat_repo_impl.dart:28-114`) — exactly **4** sequential, awaited, non-batched Firestore operations per send:

1. `addToSubcollection(...)` → `.collection('conversations/$conversationId/messages').add(data)` — new message doc, auto-ID (`chat_repo_impl.dart:55-59`).
2. `setDocument(path:'conversations/$conversationId', merge:true)` — conversation meta (`chat_repo_impl.dart:91-95`).
3. `setDocument(path:'userConversations/$senderId/contacts/$receiverId', merge:true)` — sender's inbox denorm (`chat_repo_impl.dart:97-101`).
4. `setDocument(path:'userConversations/$receiverId/contacts/$senderId', merge:true)` — receiver's inbox denorm (`chat_repo_impl.dart:103-107`).

`FirebaseConsumer.batch()` exists (`core/utils/firebase/firebase_consumer.dart:93-95`, implemented `firebase_consumer_impl.dart:265-295`) but is **never called anywhere in the Chat feature** — confirmed by reading every Chat file. A failure between writes 1 and 4 leaves inconsistent state (message stored, inbox/meta docs stale) with no rollback; only a blanket `try/catch` wraps the whole function.

**Recommendation for Angular**: replace all 4 with a single `writeBatch()`:
```ts
const batch = writeBatch(firestore);
batch.set(doc(collection(firestore, `conversations/${conversationId}/messages`)), messageData);
batch.set(doc(firestore, `conversations/${conversationId}`), conversationMeta, { merge: true });
batch.set(doc(firestore, `userConversations/${senderId}/contacts/${receiverId}`), senderEntry, { merge: true });
batch.set(doc(firestore, `userConversations/${receiverId}/contacts/${senderId}`), receiverEntry, { merge: true });
await batch.commit();
```

### 4.7 Timestamps

**Exclusively client-side `Timestamp.now()`** (`chat_repo_impl.dart:40`), reused for all 4 writes in one send action (internally consistent per-action, but device-clock-based, not server-authoritative). `FieldValue.serverTimestamp()` is never used anywhere in the Chat feature. Angular should use `serverTimestamp()` for new writes — a deliberate, documented improvement, not a silent behavior change.

### 4.8 No optimistic UI, no typing indicators, no presence writes

- **No optimistic UI**: `ChatMessagesCubit` does not mutate local state before/after `sendMessage()` resolves (comment in source, `chat_messages_cubit.dart:73-75`: "Message sent successfully - stream will update automatically"). The UI relies entirely on the round-trip through Firestore's snapshot listener. Only the text field is cleared immediately on tap; the message bubble itself waits for the stream.
- **No typing indicator**: zero matches for "typing" anywhere in the Chat feature.
- **No presence writes**: `isOnline`/`lastSeen` exist as read-only fields on `ChatUser` (`chat_user.dart:8-9,19-20`) and are rendered as a small dot in the UI, but **nothing in the codebase ever writes them** — confirmed by grepping the whole tree; these fields are decorative and will reflect whatever (or nothing) some other unknown producer put there.
- **`unreadCount`**: written only on the sender's own inbox doc, hardcoded to `0` always (never incremented); absent entirely from the receiver's doc; never read/displayed in any chat screen. Dead field.
- **`markMessageAsRead`**: fully implemented (`chat_repo_impl.dart:117-125`, wired through `MarkMessageAsReadEvent`/`ChatMessagesCubit._onMarkMessageAsRead`) but **never dispatched from any UI code** — confirmed by grepping both chat screen files. Dead plumbing.

### 4.9 Firebase Auth hardening recommendation

Current state: `request.auth` is always `null` for every chat read/write, since the app never signs in to Firebase Auth (§4.1). Any Firestore security rules deployed today must therefore either be wide-open (`allow read, write: if true;`) or rely on some out-of-band mechanism not present in this codebase — this is a real gap the Angular rebuild should close, not preserve.

Recommended approach: mint a Firebase custom token from the .NET backend at login (using the Firebase Admin SDK, keyed off the same identity that issues the REST Bearer token), sign in to Firebase Auth client-side with `signInWithCustomToken()`, and gate rules on `request.auth.uid` plus the `members` array already present on the `conversations/{conversationId}` document (`chat_repo_impl.dart:67`: `'members': [senderId, receiverId]`):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in resource.data.members;

      match /messages/{messageId} {
        allow read: if request.auth != null &&
          request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.members;
        allow create: if request.auth != null &&
          request.auth.uid == request.resource.data.senderId;
      }
    }
    match /userConversations/{userId}/contacts/{contactId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /Users/{userId} {
      allow read: if request.auth != null;
    }
  }
}
```

This is illustrative — exact rule design depends on the custom-token identity scheme chosen; it is not a drop-in file, it demonstrates the gating mechanism the current app has none of.

---

## 5. Design system

### 5.1 Colors (`core/utils/colors/colors.dart`, full file — 11 constants, verified byte-exact)

| Constant | Hex | Note |
|---|---|---|
| `bIcon` | `#ABBD66` | |
| `black` | `#000000` | |
| `kprimary` | `#ABBD66` | primary green |
| `kBlack` | `#000000` | duplicate of `black` |
| `kwhite` | `#FFFFFF` | |
| `kgrey` | `#9E9E9E` | |
| `kgrey2` | `#949494` | |
| `kprimary1` | `#99B336` | a **second**, different green |
| `brown` | `#000000` | misnamed — value is black, not brown |
| `geryblack` | `#444444` | |
| `greenMember` | `#ABBD66` @ 50% alpha (`0x80ABBD66`) | same RGB as `kprimary`/`bIcon` |

**Additional greens found hardcoded outside `colors.dart`** (confirms design-token fragmentation, duplication map row 4):
- `core/widgets/custom_button.dart:31` and `core/widgets/custom_text_field.dart:42,46,50`: `#9DC183`
- `feature/bar_navigation/presentation/screen/buildsidebar.dart:27`: `#AECB70` (sidebar panel background)
- `core/const/widget/table/status_cell.dart:26` and `core/const/widget/mobile_table/visit_card.dart:52`: `#B5CC6D` (accept button)
- Reject/error red, consistent across both: `#E74A3B` (`status_cell.dart:47`, `visit_card.dart:54`)
- `core/utils/appstyle/app_styles.dart:10`: `#064060` (dark blue, used only by `styleRegular16`, not present in `colors.dart` at all)

**At least five distinct "brand green" values are in production use.** The Angular design-token file must make one explicit choice (flag for design/product sign-off, not a silent pick).

### 5.2 Font

`core/utils/font/fonts.dart` (full file): single family constant `Fonts.font = "Alexandria"`, applied via `ThemeData(fontFamily: Fonts.font)` (`main.dart:75`). Weights observed in use: `w400`, `w500`, `w600`, `w700`, `bold`. No separate weight-specific family names — weight comes from whichever static font-asset variants are registered (not visible in this source subset).

### 5.3 Responsive scaling formula (`core/utils/appstyle/app_styles.dart:53-77`, `size_config.dart`, full files)

```dart
double getScaleFactor(context) {
  var physicalWidth = PlatformDispatcher.instance.views.first.physicalSize.width;
  var devicePixelRatio = PlatformDispatcher.instance.views.first.devicePixelRatio;
  double width = physicalWidth / devicePixelRatio;
  if (width < SizeConfig.tablet) return width / 550;        // < 800
  else if (width < SizeConfig.desktop) return width / 1000; // < 1200
  else return width / 1920;
}

double getResponsiveFontSize(context, {required double fontSize}) {
  double responsiveFontSize = fontSize * getScaleFactor(context);
  return responsiveFontSize.clamp(fontSize * 0.8, fontSize * 1.2);
}
```

This is **not** a plain `clamp()` — it is a three-bracket ratio-divide (`width / 550`, `/1000`, or `/1920` depending on which breakpoint bracket the physical width falls into) multiplied against the base font size, and *then* the result is clamped to `[fontSize×0.8, fontSize×1.2]`. It also deliberately ignores `MediaQuery.sizeOf(context)` in favor of `PlatformDispatcher`'s physical-pixel width — the `context` parameter is effectively vestigial for this calculation. Angular equivalent: a `responsive-font-size()` SCSS function or a signal-based `ScaleService` replicating the same three-bracket ratio, or (preferred, simpler, and equally faithful in outcome) CSS `clamp()` with viewport-relative units tuned to match the same visual output — a design call to confirm with product, not silently substitute.

### 5.4 Breakpoints — one consistent system, but re-implemented ad hoc per screen

`SizeConfig` (`size_config.dart:2-3`): `tablet = 800`, `desktop = 1200`. `ResponsiveBuilder` (`core/utils/responsive/responsive_builder.dart:11`) defaults its own `breakpoint` param to `800`, matching. `custom_column_slider.dart:24-25` independently redeclares `isMobile = width < 800` / `isComputer = width >= 1200` in the single shell widget. **These three sources agree on the same two numbers (800/1200)** — so there is not a second, conflicting breakpoint *value* in the files inspected, but there is a duplication of the *check itself*: each `*_responsive.dart` screen re-implements its own `LayoutBuilder`/width comparison rather than sharing one utility, which is the real risk (a future edit to one copy silently diverging from the others). Angular: one `BreakpointService`/CSS custom-media-query pair (`--mobile: 800px`, `--desktop: 1200px`), referenced everywhere, defined once.

### 5.5 RTL / LTR handling

Global direction is RTL (Arabic locale). LTR is explicitly force-overridden in a small, consistent set of places — all in sidebar/navigation chrome, where the developers wanted fixed icon-then-label ordering regardless of the RTL locale:

- `core/const/widget/side_bar_item.dart:28-29` — `Directionality(textDirection: TextDirection.ltr, ...)` wrapping a sidebar item's `title`.
- `core/const/widget/expansion_sidebar_item.dart:43` and `:87-88` — same pattern, both the parent and child title slots of an expandable sidebar group.
- `feature/bar_navigation/presentation/screen/custom_column_slider.dart:52` — wraps the entire content-switch area; the outer shell (`custom_column_slider.dart:52-53`) is actually forced **RTL** explicitly (`Directionality(textDirection: TextDirection.rtl, ...)`), the opposite of the sidebar-item overrides — confirm the exact directionality per usage before porting, do not assume all `Directionality` usages force the same direction.
- `feature/Account_Management/presentation/view/screen/responsive_add_bond.dart:371` — same LTR-forcing pattern on a dropdown/list-tile title.
- `core/const/widget/mobile_table/row_item.dart` — explicitly sets `textDirection: TextDirection.rtl` on its label/value `Row` (i.e., an explicit RTL assertion, not an override away from it).
- Tables that render numeric/English content (villa numbers, amounts, dates) generally do not force direction and simply inherit the ambient RTL — Angular should apply `dir="ltr"` narrowly, via the proposed `rtl-override.directive.ts` (Section 1.4), only to the specific nav-chrome elements identified above, not blanket the whole app.

---

## 6. Navigation & routing

### 6.1 Real routes — confirmed exactly 4

`core/utils/route/approutes.dart` (full file, 32 lines):

```dart
class Routes {
  static const String login = '/login';
  static const String splash = '/splash';
  static const String home = '/home';
  static const String forgetPassword = '/forget_password';
}
```

`AppRouter.getRoute` maps each to a `MaterialPageRoute`: `login`→`ResponsiveLogin`, `forgetPassword`→`Responsiveforgetpassword`, `home`→`SidebarMenu`, `splash`→`Splashscreen`, default→`ResponsiveLogin`. All 4 are genuinely wired and reachable (`Routes.splash` from `main.dart:84`; `Routes.forgetPassword` pushed from both login screen variants; `Routes.home`/`Routes.login` decided by the splash screen's session check). **Note**: the actual post-login navigation does **not** use the named `Routes.home` route — both login screen variants call `Navigator.pushAndRemoveUntil(..., MaterialPageRoute(builder: (_) => const SidebarMenu()))` directly, bypassing the named-route table entirely. `Routes.home` is only exercised by the splash screen.

A dead example file exists — `feature/Account_Management/presentation/view/screen/menu_integration_example.dart` defines its own unrelated, never-imported `AppRoutes` class with a `/bulk-disbursement` path; its one call site is inside a `/* ... */` comment block. Not live.

### 6.2 Sidebar structure — the true screen count (resolving the 11 vs 14 discrepancy)

Ground truth from `feature/bar_navigation/manger/bar_cubit.dart` (`BottomCubit.menuItems()`, lines 141-235, and `currentScreen`, lines 86-139) and `feature/bar_navigation/presentation/screen/buildsidebar.dart`, both read in full.

**5 top-level sidebar entries** (4 expandable groups + 1 leaf), rendered in this exact order:

| Render order | Type | Arabic label (verbatim) | Icon | Sub-items |
|---|---|---|---|---|
| 1 | Expansion group | `"الملاك"` (hardcoded string, `bar_cubit.dart:143`) | `Icons.people` | 2 |
| 2 | Expansion group | `AppLocalizations....security` → `"الأمن"` | `Icons.security` | 2 |
| 3 | Expansion group | `AppLocalizations....user_management` → `"إدارة المستخدمين"` | `Icons.supervised_user_circle` | 2 |
| 4 | Expansion group | `AppLocalizations....account_management` → `"إدارة الحساب"` | `Icons.settings` | 4 (a 5th is commented out, `bar_cubit.dart:224-229`) |
| 5 | Leaf (no sub-items) | `AppLocalizations....chat` → `"الدردشات"` | `Icons.chat_bubble_outline` | — (navigates directly to `ResponsiveChat`) |

**10 sidebar-tappable leaf screens total**: 2 (Owners) + 2 (Security) + 2 (User Management) + 4 (Account Management) + 1 (Chat) = **10**.

Full leaf list, with the `changeSubItem(mainIndex, subIndex)` semantic index each one sets (note: semantic index ≠ render position — see the bug noted below):

1. "اضافة مالك" (Add Owner) → `(2,0)` → `ResponsiveAddUser`
2. "كل الملاك" (All Owners) → `(2,1)` → `ResponsiveAllOwners`
3. "إضافة حارس أمن" (Add Security Guard) → `(0,0)` → `ResponsiveAddSecurity`
4. "عرض حراس الأمن" (View Security Guards) → `(0,1)` → `ResponsiveSecurityView`
5. "إضافة مستخدم" (Add User) → `(3,0)` → `ResponsiveAddUserScreen`
6. "عرض جميع المستخدمين" (View All Users) → `(3,1)` → `ResponsiveViewUsersScreen`
7. "سندات القبض" (Receipt Vouchers) → `(1,0)` → `ReceiptsResponsive` (or `CreateReceiptBondForCompoundResponsive` if the hidden `finance` toggle ≠ 0)
8. "مقبوضات" (Collections) → `(1,2)` → `ResponsiveCollectionsScreen`
9. "سندات الصرف" (Disbursement/Payment Vouchers) → `(1,3)` → `DisbursementVouchersResponsive`
10. "إدارة المصروفات" (Bulk Disbursement) → `(1,1)` → `BulkDisbursementScreenWrapper`
11. "الدردشات" (Chat) → leaf → `ResponsiveChat`

(11 numbered above because "Owners" group is listed first but is semantic index 2 — see the discrepancy explanation below; the group/leaf count is still 10 leaves + the already-counted group headers.)

**Why the draft plan's counts (11 vs 14) both existed, resolved precisely:**
- **~11** comes from counting the 10 sidebar-tappable leaves (as listed above) — sometimes off-by-one depending on whether the Chat leaf itself is counted as a "leaf under a group" or a "top-level item."
- **~14** comes from counting every distinct widget referenced in `currentScreen`'s switch statement, including screens **not reachable from any visible `SidebarSubItem`**: a 5th Account-Management sub-item (`ResponsiveMembersAccountStatement` / `SummarybondbyyearStatementResponsive`, gated by `selectedSubIndex == 4`) whose sidebar entry is commented out (`bar_cubit.dart:224-229`), plus `AccountManagementChoose` (the `default:` case for Account Management) and its own internal hub cards, which call `changefinnaceAndItem(value, 5)` — index `5` matches no case in `currentScreen`'s switch, so tapping those cards always redraws `AccountManagementChoose` itself; the `finance` value they set only takes visible effect if the user *separately* navigates the sidebar to sub-index 0 or 4 afterward (a two-step, non-obvious interaction). `AccountManagementChoose` is itself never reachable through a normal sidebar tap under the current 4 wired sub-items (0,1,2,3 all match real cases), making it effectively orphaned hub screen.

**Ground truth for the Angular rebuild: build 10 real routed screens for the wired sidebar leaves, one route each. Treat `ResponsiveMembersAccountStatement`, `SummarybondbyyearStatementResponsive`, and `AccountManagementChoose` as Phase 2 (Section 11) since they are not reachable through the shipped sidebar UI as of this source snapshot.**

### 6.3 Confirmed bugs in the sidebar itself

- **Sidebar highlight bug**: `buildsidebar.dart:112,124` — `isSelected: cubit.selectedMainIndex == idx` compares the **semantic** group id (`selectedMainIndex`, values 0-4 assigned by `currentScreen`'s switch) against `idx`, the **list render position** (0-4 in render order). Since "Owners" renders first (`idx=0`) but its semantic id is `2`, and `BottomCubit` initializes `selectedMainIndex = 2, selectedSubIndex = 1` (`bar_cubit.dart:36-37`), **no sidebar group is ever highlighted as selected on first load**, even though the content area correctly shows "All Owners" (case 2/sub 1). This is a genuine, verifiable bug — Angular's route-driven `routerLinkActive` sidesteps it entirely by construction.
- **Landing screen after login**: not a dedicated "home/dashboard" screen — it is whatever `BottomCubit`'s constructor defaults resolve to, which is **`ResponsiveAllOwners()`** (`bar_cubit.dart:36-37`: `selectedMainIndex=2, selectedSubIndex=1` → `currentScreen`'s case 2/sub 1). Angular should make this an explicit, intentional default route (e.g. redirect `/` → `/owners` or a real dashboard), not an implicit side effect of field initialization order.

### 6.4 Role-based access — confirmed none exists

Grepped "role" across the entire `lib/` tree. It appears in exactly three unrelated places: (1) saved at login as `roles.first ?? 'user'` (`auth_repo_imp.dart:51-53`); (2) read once at splash purely for null-check routing, never for its value (`main.dart:121,125`); (3) used when *creating* a new system user to assign *that new user's* role (`add_user_request_model.dart`), unrelated to gating the current user's own UI. **Every logged-in user sees the identical sidebar regardless of role.** Angular should not invent role-based menu filtering that doesn't exist today — if it's wanted, it's a new feature, not a port.

### 6.5 Proposed Angular route map

```
/login
/forgot-password
/reset-password
/                          → redirect to /owners (matches current de-facto landing screen)
/owners                    (All Owners — leaf 2 above)
/owners/new                (Add Owner — leaf 1)
/security-guards
/security-guards/new
/system-users
/system-users/new
/accounts/receipts
/accounts/disbursements
/accounts/bulk-disbursement
/collections
/chat
/chat/:contactId
```
Phase 2 (Section 11), added once their backing screens are confirmed reachable/complete: `/accounts/member-statement`, `/accounts/bonds-summary`, `/bonds/compound-disbursement`, `/invitations`, `/invitations/new`.

---

## 7. Screens

Layout convention throughout the current app: every screen ships two hand-written variants (`*_mobile.dart` / `*_tablet.dart`) selected by `ResponsiveBuilder`/ad hoc `LayoutBuilder` at the 800px breakpoint (Section 5.4). Angular should use one component per screen with CSS responsive layout (flex/grid) instead of two component trees — this alone removes a large, systemic duplication not called out as its own numbered row in Section 1.5 because it is structural to the whole screen inventory below.

### 7.1 تسجيل الدخول (Login)

- Sidebar path: none (pre-auth). Angular route: `/login`.
- Fields (`feature/Auth/presentation/view/screen/mobile/tablet loginscreen.dart`):
  - البريد الإلكتروني (Email) — validator: non-empty (`please` message if empty) + `contains('@')` check (`invalid_email` if not) — **not a full regex**, just a substring check on the login screen specifically (contrast with forgot/reset password below, which use a real regex).
  - كلمة السر (Password) — non-empty only, no strength check on login.
  - "تذكرني دائمًا" (Remember me) checkbox — **tablet only** (absent on mobile). Confirmed dead: `value: true` (hardcoded literal, not state-backed), `onChanged: (_) {}` (no-op) — `tablet_loginscreen.dart:184-198`. The `rememberMe: true` sent in the login API body is a separate, unrelated hardcoded literal.
- On success: hardcoded (non-localized) Arabic SnackBar `"تم تسجيل الدخول بنجاح"`, then `Navigator.pushAndRemoveUntil` straight to `SidebarMenu` (bypassing the named `Routes.home` route).
- States (`AuthState`, `feature/Auth/presentation/manger/auth_state.dart`): `AuthInitial, AuthLoading, AuthSuccess, AuthFailure, AuthForgetPasswordSuccess, AuthResetPasswordSuccess`.

### 7.2 هل نسيت كلمة المرور؟ (Forgot password) / إعادة تعيين كلمة المرور (Reset password)

- Angular routes: `/forgot-password`, `/reset-password`.
- Forgot-password email field regex (verbatim): `r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$'`.
- Reset-password fields: البريد الإلكتروني (same regex as above), رمز التحقق (token — required only, no format check), كلمة السر الجديدة (new password) — regex (verbatim): `r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#\$&*~%^_])[A-Za-z\d!@#\$&*~%^_]{8,}$'` (≥1 lowercase, ≥1 uppercase, ≥1 digit, ≥1 of `!@#$&*~%^_`, min length 8).

### 7.3 اضافة مالك (Add Owner) / كل الملاك (All Owners)

- Sidebar group: الملاك. Angular routes: `/owners/new`, `/owners`.
- Add Owner fields (`feature/add_users/presentaion/widget/add_user_mobile.dart` / `add_user_tablet.dart`):

| Field (Arabic label via l10n) | Type | Validator (verbatim) | Error (l10n key) |
|---|---|---|---|
| الاسم | text | non-empty; `length < 2` | `please_enter_name`; `name_must_be_at_least_2_characters` |
| رقم الهاتف | text | `r'^\d{10,}$'` | `enter_valid_phone_number` |
| البريد الإلكتروني | text | `r'^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$'` | `enter_valid_email` |
| كلمة السر | text | `length < 8`; then `r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#\$&*~]).{8,}$'` | `password_must_be_at_least_8_characters`; `password_complexity_error` |
| عنوان الفيلا | text | `length < 5` | `villa_address_must_be_at_least_5_characters` |
| رقم الفيلا | text | required only — numeric check is **commented out** in source (`add_user_mobile.dart:186-190`) | `please_enter_villa_number` |
| موقع الفيلا | text | `length < 5` | `villa_location_must_be_at_least_5_characters` |
| الشارع | text | `length < 3` | `street_must_be_at_least_3_characters` |
| المساحة (tablet only — mobile field is present but unused at submit) | text | `r'^\d+(\.\d+)?$'` | `area_must_be_valid_number` |
| عدد الأدوار | text | `r'^\d+$'` | `number_of_floors_must_be_numeric` |

- All Owners table (`all_owners_tablet.dart:48-73`), all columns `flex: 2`: البريد الإلكتروني (`item.email`), الاسم (`item.userName`), رقم الفيلا (`item.villaNumber.toString()`), الهاتف (`item.phoneNumber`), الصورة (avatar, base-URL-prepended per §3.2), الإجراء (`StatusCell`, accept=edit, refuse=delete).
- Delete: fires immediately on tap, **no confirmation dialog** (`all_owners_tablet.dart:151-155`, `all_owners_mobile.dart:63-67`).
- Edit dialog anti-pattern: `owner_edit_alert_dialog.dart:19-31` creates 10 `TextEditingController`s directly inside `build()` — every rebuild (including the dialog's own `BlocConsumer` state changes) recreates them, discarding in-progress edits.
- States (`UserState`, `feature/UserManagement/presentation/manger/user_state.dart`): `GetAllOwnersLoading, GetAllOwnersSuccess, GetAllOwnersFailure, UpdateOwnerLoading, UpdateOwnerSuccess, UpdateOwnerFailure, DeleteOwnerLoading, DeleteOwnerSuccess, DeleteOwnerFailure`, plus add-user/get-all-members/get-all-users variants (14 total, see Section 8).

### 7.4 إضافة حارس أمن (Add Security Guard) / عرض حراس الأمن (View Security Guards)

- Sidebar group: الأمن. Angular routes: `/security-guards/new`, `/security-guards`.
- Add fields: الاسم (same required+length-2 rule as Owner), الهاتف (`r'^\d{10,}$'`), البريد الإلكتروني (regex **differs between mobile and tablet**: mobile `r'^[\w-]+@([\w-]+\.)+[\w-]{2,4}$'` vs tablet `r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$'` — the tablet variant additionally allows a literal `.` before the `@`; treat as a bug, standardize on one regex in Angular), كلمة السر (same as Owner), رقم البوابة (`r'^\d+$'`, error `gate_number_must_be_numeric`).
- View table (`security_view_tablet.dart:92-116`), all `flex: 2`: البريد الإلكتروني, الاسم, رقم البوابة, الهاتف, الصورة (used **as-is**, no base-URL prepending — see §3.4), الإجراء (edit/delete).
- Delete: immediate, no confirmation (`security_view_tablet.dart:181-185`, `security_view_mobile.dart:62-64`).
- Edit dialog anti-pattern: `security_show_alert_dialoug.dart:19-26`, 5 `TextEditingController`s inside `build()`.
- States (`SecurityState`): `SecurityInitial, SecuritySuccful, SecurityFailure, Securitydelete, SecurityLoading, SecurityUpdate, EditImagePickerProfileViewSuccess, EditImagePickerProfileViewError`.

### 7.5 إضافة مستخدم (Add User) / عرض جميع المستخدمين (View All Users) — system users

- Sidebar group: إدارة المستخدمين. Angular routes: `/system-users/new`, `/system-users`.
- Add User: email/password/fullName/phoneNumber/roles — a role picker (`UserRole` enum) is the only field distinguishing this from the Owner form.
- View table uses Flutter's plain `DataTable` (not the shared `HeaderCell`/`DataCell`), hardcoded (non-localized) headers: `'الاسم الكامل'`, `'البريد الإلكتروني'`, `'رقم الهاتف'`, `'الصلاحية'` (role, via `getRolesInArabic()` mapping `'Admin'→'مسؤول'`, `'Account Manager'→'مدير حسابات'`). **No edit/delete actions or column exist in this table at all** — confirmed no update/delete endpoint exists for this feature either (§3.3).
- States (`UsersManagementState`): `UsersManagementInitial, UsersManagementAddingUser, UsersManagementUserAdded, UsersManagementLoadingUsers, UsersManagementUsersLoaded, UsersManagementError`.

### 7.6 سندات القبض (Receipt Vouchers) / سندات الصرف (Disbursement Vouchers) / إدارة المصروفات (Bulk Disbursement)

- Sidebar group: إدارة الحساب. Angular routes: `/accounts/receipts`, `/accounts/disbursements`, `/accounts/bulk-disbursement`.
- Receipts table (`receipts_tablet.dart:77-107`):

| Header (l10n key → Arabic) | flex | Bound field |
|---|---|---|
| `voucher_date` → تاريخ السند | 2 | `row.date` |
| `currency` → العملة | 1 | `row.currency` |
| `creditor` → الدائن | 1 | `row.memberName` |
| `account_num` → رقم الحساب | 1 | `row.amount.toString()` |
| `villa_number` → رقم الفيلا | 1 | `row.villaNumber.toString()` |
| `description` → الوصف | 1 | `row.bondDescription` |
| `type` → النوع | 1 | **bug**: `row.type == "Receipt" ? s.receipt : s.receipt` — both ternary branches are identical (`receipts_tablet.dart:139-145`), so this column always shows "سند قبض" regardless of actual type. Verify against backend data whether this should branch to `s.payment_bond` for the false case, and fix in Angular. |

Disbursement Vouchers table: identical column set/order, same bug pattern inverted: `row.type == "Disbursement" ? s.payment_bond : row.type` (`disbursement_vouchers_tablet.dart:139-145`) — this one is **not** symmetric with the Receipts bug (it does show a different value in the false branch), so do not assume both tables share the same defect; verify each independently, which was done here.

- Create Bond form (shared by both, `type` field distinguishes Receipt vs Disbursement):

| Field | Validator (verbatim) | Note |
|---|---|---|
| تاريخ السند * | non-empty (`please_enter_bond_date`) | date picker |
| العملة * | dropdown `[USD, SAR, EGP, AED]`, submit-time null check → `please_select_bond_type_and_currency` | |
| نوع السند | dropdown `[سند قبض, سند صرف]` → mapped to `"Receipt"`/`"Disbursement"` | |
| المبلغ * | mobile: `double.tryParse`; **tablet: `int.tryParse`** (`create_bond_ablet.dart:158-166`) — inconsistent, decimals silently rejected on tablet only | `please_enter_amount`; `amount_must_be_numeric` |
| وصف السند | non-empty | `please_enter_bond_description` |
| رقم الفيلا | non-empty, then `int.tryParse` check | `please_enter_villa_number`; `villa_number_must_be_numeric` |

- Filters: **server-side**, confirmed — `onSearch` triggers `personCubit.getAllReceiptBonds(1)`/`getAllDisbursementBonds(1)` with the filter values passed straight into the API call's query string (`receipts_tablet.dart:39-48`, `accountmangmentrepoimp.dart:140-151`), not `.where()` on an already-fetched list.
- Pagination: page size **20** (`person_cubit.dart:17`), envelope `{items, page, pageSize, totalItems, totalPages}`.
- Bulk Disbursement form is **not** wrapped in a `Form`/`GlobalKey<FormState>` — validated manually on submit (`bulk_disbursement_screen.dart:89-118`), all error strings hardcoded Arabic (not localized): فيلا واحدة على الأقل (`'الرجاء اختيار فيلا واحدة على الأقل'`), سعر المتر (empty-check only, no numeric-format validation — `double.parse` on submit can throw uncaught if non-numeric), وصف السند (empty-check only). العملة is a fixed, non-editable "EGP - الجنيه المصري" display.
- States (`PersonState`, 20 subclasses) and (`BulkDisbursementState`, 7 subclasses) — see Section 8.

### 7.7 مقبوضات (Collections)

- Sidebar group: إدارة الحساب. Angular route: `/collections`.
- **Create-only screen — no list/table exists in this feature at all** (confirmed: no `HeaderCell`/`DataCell`/`PaginationControls` anywhere in `feature/collections/`).
- Fields (all hardcoded Arabic error strings, not localized): اختر الفيلا (dropdown of `VillaModel`, submit-time null check → `'يرجى اختيار الفيلا'`), المبلغ المدفوع (`if empty → 'يرجى إدخال المبلغ'`; `double.tryParse == null → 'يرجى إدخال رقم صحيح'`), الوصف (`maxLines:3`, empty check → `'يرجى إدخال الوصف'`), date picker (defaults today, no validation), العملة (fixed "EGP", non-editable).
- Submits to the shared `memberReceipt` endpoint — see §3.6 dual-payload note.
- States (`CollectionsState`): `CollectionsInitial, CollectionsLoadingVillas, CollectionsVillasLoaded, CollectionsSubmitting, CollectionsSuccess, CollectionsError`.

### 7.8 الدردشات (Chat)

- Sidebar: leaf item, no sub-items. Angular routes: `/chat`, `/chat/:contactId`.
- Contacts list: realtime stream of `userConversations/admin/contacts`, ordered by `lastMessageTime` desc (§4.5). Each row shows name, last message preview, and a decorative (non-functional) online/offline dot.
- Conversation view: realtime stream of `conversations/{conversationId}/messages`, ordered `timestamp` desc, unbounded (no pagination/lazy-load of older messages — flag as a future scalability concern, not present as a bug today since message volume is presumably low).
- Composer: single text field + send button; no attachment/image send UI observed in the message type enum's `image`/`file` variants (defined in the model but not exposed in the current send UI).
- No typing indicator, no read receipts surfaced in UI (despite `isRead`/`markMessageAsRead` existing in data layer — dead plumbing per §4.8).
- Chat search icon: present in the contacts screen's app bar per the plan's suspicion — **not independently re-verified with a line citation in this research pass**; flag as unconfirmed rather than asserting it as fact (spot-check before Angular implementation).

### 7.9 Shared component inventory

| Component | Current Flutter source(s) | Used by |
|---|---|---|
| Button | `core/const/widget/custom_button.dart` **and** `core/widgets/custom_button.dart` (2 competing implementations) | Nearly every screen |
| Table header cell | `core/const/widget/table/headercell.dart` | Receipts, Disbursements, Owners, Security, Members Statement, Bonds Summary, Compound Receipt, Home/Invitations tables |
| Table data cell | `core/const/widget/table/data_cell.dart` | same as above |
| Table status/action cell | `core/const/widget/table/status_cell.dart` | Owners, Security, Members Statement (accept/reject-styled edit/delete buttons) |
| Mobile card row primitives | `core/const/widget/mobile_table/mobile_button.dart`, `row_item.dart`, `visit_card.dart` | Mobile variants of the same table-backed screens, and Home invitations mobile cards |
| Labeled text field (CRUD style) | `core/const/widget/textformcrud.dart` | Add Owner/Security/Bond/etc. forms |
| Labeled text field (Material style) | `core/widgets/custom_text_field.dart` | Collections form, some newer screens |
| Dropdown (CRUD style) | `core/const/dropdownformcrud.dart` | Older forms |
| Dropdown (card style, no validator) | `core/const/widget/custom_drop_down_menu.dart` | Create Bond, Collections |
| Pagination controls | `core/const/paginationcontrols.dart` | Every paginated list screen |
| Snackbar | `core/widgets/custom_snack_bar.dart` | App-wide, via a global `scaffoldMessengerKey` |
| Table shimmer/skeleton | `core/widgets/generic_table_shimmer.dart` + `shimmer_loading.dart` | Owners, Security, Users tables (each also has its own bespoke `*_table_shimmer.dart` variant — another near-duplication not separately numbered above) |
| Loading spinner | `core/widgets/loading_widget.dart` (misleadingly named `LoadingButton`) | Buttons awaiting an API call |

---

## 8. State machines

| Cubit/Bloc | File | State classes (verbatim, grepped from source) |
|---|---|---|
| `AuthCubit` | `feature/Auth/presentation/manger/auth_state.dart` | `AuthInitial, AuthLoading, AuthSuccess, AuthFailure, AuthForgetPasswordSuccess, AuthResetPasswordSuccess` (6) |
| `AdduserCubit` | `feature/add_users/presentaion/manger/adduser_state.dart` | `AdduserInitial, AdduserLoading, AdduserSuccess, AdduserFailure, EditImagePickerProfileViewSuccess, EditImagePickerProfileViewError, EditImagePickerProfileViewLoading, Addsecuritysucces, AddsecurityFailure, AddpersonFailure, AdduserpersonSuccess` (11, `AdduserState` abstract not counted) |
| `UserCubit` (UserManagement) | `feature/UserManagement/presentation/manger/user_state.dart` | `Adduserfailure, Addusersuccful, Getallmemebersuccful, GetallmemeberLoading, Getallmemeberfailure, GetAllUsersSuccessState, GetAllUsersLoadingState, GetAllUsersFailureState, GetAllOwnersLoading, GetAllOwnersSuccess, GetAllOwnersFailure, UpdateOwnerLoading, UpdateOwnerSuccess, UpdateOwnerFailure, DeleteOwnerLoading, DeleteOwnerSuccess, DeleteOwnerFailure` (17, `UserState` sealed not counted) |
| `UsersManagementCubit` (lowercase) | `feature/users_management/presentation/manger/users_management_state.dart` | `UsersManagementInitial, UsersManagementAddingUser, UsersManagementUserAdded, UsersManagementLoadingUsers, UsersManagementUsersLoaded, UsersManagementError` (6) |
| `SecurityCubit` | `feature/security_view/presentation/manger/security_state.dart` | `SecurityInitial, SecuritySuccful, SecurityFailure, Securitydelete, SecurityLoading, SecurityUpdate, EditImagePickerProfileViewSuccess, EditImagePickerProfileViewError` (8) |
| `PersonCubit` (Account Management) | `feature/Account_Management/presentation/manger/person_state.dart` | `PersonInitial, PersonLoading, Allmemberssuccful, Allmembersfailure, DeleteSuccess, Deletefailure, UpdateSuccessful, UpdateUserFail, CreateBondSuccess, CreateBondFail, ReceiptBondSuccess, ReceiptBondFail, DisbursementBondSuccess, DisbursementBondFail, CreateBoncompounddSuccess, CreateBondcompoundFail, CompoundDisbursementBondsPageFail, CompoundDisbursementBondsPageSuccess, SummarybondbyvillanumberFail, Summarybondbyvillanumbersuccful` (20) |
| `BulkDisbursementCubit` | `feature/Account_Management/presentation/manger/bulk_disbursement_state.dart` | `BulkDisbursementInitial, VillasListLoading, VillasListLoaded, VillasListError, BulkDisbursementLoading, BulkDisbursementSuccess, BulkDisbursementError` (7) |
| `CollectionsCubit` | `feature/collections/presentation/manger/collections_state.dart` | `CollectionsInitial, CollectionsLoadingVillas, CollectionsVillasLoaded, CollectionsSubmitting, CollectionsSuccess, CollectionsError` (6) |
| `HomeinvitationCubit` | `feature/Home/presentation/manger/homeinvitation_state.dart` | `Invitationsuccful, Invitationfailure` (2, `HomeinvitationState` sealed not counted) |
| `SecurityonetimeCubit` (Create Invite) | `feature/create_invite/presentation/manger/securityonetime_state.dart` | `EditImagePickerProfileViewSuccess, EditImagePickerProfileViewError, EditImagePickerProfileViewLoading, GetVillaNumberLoading, GetVillaNumberSuccess, GetVillaNumberError` (6) |
| `BottomCubit` (sidebar/navigation) | `feature/bar_navigation/manger/bar_state.dart` | `BottomInitial, BottomItemSelected, BottomItemSelectedfinnance (unused — never emitted), Changevillanumber, BottomSubItemSelected` (5) |
| `LocalizationCubit` | `feature/localization/manger/localization_state.dart` | `LocalizationInitial, ChangeLanguage` (2 — dead, never wired to `MaterialApp.locale`, see Section 9) |
| `ChatContactsCubit` | `feature/Chat/presentation/manager/chat_contacts_cubit.dart` (Bloc, no dedicated state file) | Uses the shared generic `BaseState<ChatUser>` (`core/bloc/base_state.dart`) with a `Status` enum (`initial, success, failure, loading, loadingMore, custom`) — **the one cubit in the app that already avoids bespoke per-feature state classes**; events: `GetContactsEvent, GetUsersEvent` |
| `ChatMessagesCubit` | `feature/Chat/presentation/manager/chat_messages_cubit.dart` (Bloc, no dedicated state file) | Same shared `BaseState<ChatMessage>`; events: `ListenToMessagesEvent, SendMessageEvent, MarkMessageAsReadEvent` |

Total: 13 feature Cubits/Blocs, 11 of which hand-roll a bespoke State class hierarchy (96 bespoke state classes combined across those 11), 2 of which (Chat) already use one shared generic state shape. Section 1.3's `RequestState<T>` generalizes the Chat pattern to all 13.

---

## 9. Localization

- **177 keys** confirmed in both `l10n/intl_ar.arb` and `l10n/intl_en.arb` (`grep -c '":' ` on each file = 177 both). Generated Dart accessors live in `l10n/app_localizations*.dart` and a legacy/parallel `generated/intl/messages_*.dart` + `generated/l10n.dart` set (two generated-code paths for the same translations — another latent duplication, lower priority than the ones in Section 1.5 since it's build-generated, not hand-authored).
- Sample keys (`l10n/intl_ar.arb`, verbatim): `"invitations": "الدعوات"`, `"login": "تسجيل الدخول"`, `"email": "البريد الإلكتروني"`, `"remember_me": "تذكرني دائمًا"`, `"villa_number": "رقم الفيلا"`, `"password_must_be_at_least_8_characters": "كلمة السر يجب أن تكون 8 أحرف على الأقل"`, `"security": "الأمن"`, `"add_security": "إضافة حارس أمن"`.
- **Hard-locked to Arabic** (`main.dart:76-77`): `locale: const Locale('ar')`, `supportedLocales: const [Locale('ar')]` — both are literal constants, not derived from any cubit or user preference.
- **`LocalizationCubit` exists but is confirmed dead for actual UI locale switching.** It is provided at app root (`main.dart:62-67`) and fully implements an `appLanguage()` method that persists a `'language'` preference and emits `ChangeLanguage(languageCode:'ar'|'en')`, but `MaterialApp.locale` never reads from it — it's the hardcoded literal above. The language-toggle button UI itself is present in source but entirely commented out (`buildsidebar.dart:44-91`). English is unreachable at the `MaterialApp` level regardless of cubit state. Angular should treat Arabic-only as the current real behavior; wiring up English is a new feature, not a port, if ever requested.
- **Hardcoded Arabic strings bypassing the l10n system**, spot-checked and confirmed present in multiple screens (not exhaustive — a full audit would need to check all 228 files, deprioritized per the outline's "spot-check" instruction):
  - `"تم تسجيل الدخول بنجاح"` (login success snackbar) — both `mobile_loginscreen.dart:158` and `tablet_loginscreen.dart:214`.
  - `"تسجيل خروج"` (logout button label) — `buildsidebar.dart:158`.
  - `"الملاك"` (Owners group title) — `bar_cubit.dart:143` — hardcoded even though sibling group titles in the same list use `AppLocalizations`.
  - `"إضافة مستخدم"`, `"عرض جميع المستخدمين"`, `"مقبوضات"`, `"إدارة المصروفات"` — sidebar sub-item titles, `bar_cubit.dart:179,185,205,217`.
  - All Bulk Disbursement and Collections form validation error strings (Section 7.6, 7.7) — entirely hardcoded, not via `AppLocalizations`.
  - `"تأكيد"` button label in reset/change-password screens (`change_password_mobile.dart:169`, `change_password_tablet.dart:179`).

---

## 10. Known Issues & Recommended Fixes

1. **Session check is OR, not AND, with no expiry.** `main.dart:118-130`: `(token != null || role != null) ? Routes.home : Routes.login`. Impact: a stale `role` value with no token grants access to the shell. Fix: Angular `SessionService` requires a valid, non-expired token; decode/verify expiry client-side and pair with the 401 interceptor (issue 2) as the real enforcement point.

2. **No 401 interceptor, no token refresh, no auto-logout.** `dio_consumer.dart:182-188` only logs and rethrows; 400/401/404/500 → Arabic message mapping is duplicated per-repo (`collections_repo_impl.dart:56-71`, `users_management_repo_impl.dart:55-61+`) and never clears the session. Fix: one `http-error.interceptor.ts`, 401 branch clears session and redirects to `/login`.

3. **No request timeout configured anywhere.** `dio_consumer.dart` sets only `baseUrl` and `headers` on `dio.options` — no `connectTimeout`/`receiveTimeout`. Fix: add an explicit `timeout()` in the Angular HTTP interceptor.

4. **Owner/security guard deletes fire immediately, no confirmation dialog.** Confirmed at `all_owners_tablet.dart:151-155`, `all_owners_mobile.dart:63-67`, `security_view_tablet.dart:181-185`, `security_view_mobile.dart:62-64` — `onReject`/delete handlers call the cubit directly with no `showDialog` gate (contrast with edit, which does open a dialog). Fix: shared `ConfirmDialogComponent` (Section 1.4) in front of every delete action.

5. **`TextEditingController()` instantiated inside `build()`.** Three confirmed sites: `add_account_mangment_responsive.dart:13-18` (dead screen, lower priority), `UserManagement/.../owner_edit_alert_dialog.dart:19-31` (10 controllers, **live** edit-owner dialog), `security_view/.../security_show_alert_dialoug.dart:19-26` (5 controllers, **live** edit-security dialog). Impact: any rebuild of the dialog (including its own `BlocConsumer` reacting to `UpdateOwnerLoading`/`SecurityUpdate`) recreates the controllers and silently discards whatever the user had typed. Fix: Reactive Forms built once per component instance (Section 1.4), structurally immune to this bug class.

6. **Logout clears cache *after* navigating away, not before.** `buildsidebar.dart:145-154`: `Navigator.pushAndRemoveUntil(...)` is called, then `CacheManager.clear()` runs after. Impact: there's a window where the login screen is already showing but the old session token/role technically still sits in storage until the clear call completes; low real-world risk given it's synchronous-ish in practice, but the ordering is backwards from best practice. Fix: clear session state first, then navigate.

7. **Sidebar highlight never matches the actual selected screen on load.** `buildsidebar.dart:112,124`: `isSelected: cubit.selectedMainIndex == idx` compares a semantic case-id against a list-render-position — see Section 6.3 for the full mechanism. Fix: Angular's `routerLinkActive` sidesteps this by construction (URL is the single source of truth).

8. **Plaintext HTTP.** Base URL is `http://78.89.159.126:9393/...`, not HTTPS (`endpoint.dart:2`) — credentials (login password) and the Bearer token travel unencrypted. Fix: this is a backend/infra change (TLS termination), out of scope for the frontend rebuild alone, but must be flagged to the team owning the API.

9. **Two green palettes / five green hex values, two SharedPreferences wrapper classes, two `CustomButton`s, three dropdown implementations, two `OwnerModel`/`UserModel` shapes.** Full detail and fixes in Section 1.5's duplication map — the single largest, most systemic issue category, and the primary reason this rebuild exists.

10. **Two breakpoint *checks* re-implemented per screen (values agree at 800/1200, but the check itself isn't shared).** See Section 5.4. Fix: one `BreakpointService`/CSS custom media query, referenced everywhere.

11. **`memberReceipt` endpoint serves two structurally different payload shapes under two different constant names** (`EndPoint.createBondForMember` vs `EndPoint.createCollection`, both literally `/Dashboard/memberReceipt`). See Section 3.6. Fix: one documented discriminated-union request type in the Angular API layer, not two same-URL constants pretending to be different endpoints.

12. **Avatar/picture URL constructed two different ways.** Owners: hardcoded `"http://78.89.159.126:9393/TheOneAPIRehana" + pictureUrl` (base URL minus `/api`, not derived from any shared constant) at `all_owners_tablet.dart:106`/`owner_card_mobile.dart:46`. Security guards: `pictureUrl` used as-is, no prepending, at `security_view_tablet.dart:146` etc. Fix: one `resolveAssetUrl()` helper (Section 1.5 row 11), and confirm with backend which convention is actually correct before assuming owners' prepending is intentional rather than a workaround for a backend inconsistency.

13. **Column data/label bug in the Receipts table.** `receipts_tablet.dart:139-145`: `row.type == "Receipt" ? s.receipt : s.receipt` — both ternary branches are identical, so the "Type" column always displays "سند قبض" regardless of the row's actual type. Fix: verify intended behavior with product/backend, then correct in the Angular table (likely should branch to `s.payment_bond` in the false case, mirroring the Disbursement table's already-correct equivalent at `disbursement_vouchers_tablet.dart:139-145`).

14. **Silent failure states — UI shows no error and no retry on several Failure states.** `PersonState`'s many `*Fail` classes (Section 8) and `UserState`'s `*Failure` classes exist and are emitted, but whether each is actually surfaced to the user (snackbar, inline error) versus silently swallowed was not exhaustively re-verified screen-by-screen in this pass beyond what the research agents sampled; flag this as an area needing a targeted UI-behavior audit during Angular implementation — do not assume every Failure state currently shows a visible message.

15. **Infinite/lingering shimmer on error was not independently reproduced/verified in this research pass** — the plan's suspicion could not be confirmed against a specific `file:line` with certainty in the time available. Flag as **unconfirmed**; verify by tracing what each screen's `BlocBuilder` renders for its `*Failure`/`*Error` state versus its `*Loading` state before assuming the shimmer keeps spinning.

16. **Missing empty states.** No dedicated "no data" / empty-list component exists anywhere in `core/const/widget/` or `core/widgets/` (confirmed absent from the full file inventory in Section 5/7.9) — every list screen presumably falls through to either an empty table or an implicit blank area when `items` is `[]`. Fix: the proposed `shared/components/empty-state/` (Section 1.4) is new functionality, not a port of existing behavior.

17. **Dead controls**: "remember me" checkbox (tablet login only) is fully non-functional (`value: true` hardcoded, `onChanged: (_) {}` no-op) — confirmed, Section 7.1. Chat search icon's wiring was **not independently re-confirmed with a line citation** in this pass — flag as unconfirmed rather than asserted fact; spot-check `chat_contacts_screen.dart`'s app bar before assuming it's dead.

18. **Dead chat plumbing.** `unreadCount` (written only as a hardcoded `0` on the sender's own doc, never incremented, never displayed) and `markMessageAsRead` (fully implemented end-to-end but never dispatched from any UI) are both confirmed present-but-unused — Section 4.8. Do not port them as inert code; either wire them up properly in Angular or omit them and document the omission.

19. **No optimistic UI, no typing indicator, no presence writes in chat** — confirmed absent, Section 4.8. Not bugs per se (the app was never designed to have them), but worth flagging as scope decisions for the Angular rebuild: decide explicitly whether to add these as new features or continue without them.

20. **No Firebase Auth — Firestore is wide open or unsecured by any per-user rule today.** Section 4.9's hardening recommendation is a deliberate improvement, not a preserved behavior.

21. **Manual `jsonEncode` on one endpoint only (reset password), raw maps everywhere else.** `auth_repo_imp.dart:129`. Cosmetic inconsistency in the Flutter code; Angular's `HttpClient` naturally serializes uniformly, so this is self-resolving as long as it isn't reintroduced ad hoc.

22. **Superseded/dead screens**: `AddAccountMangment` (`feature/add_users/presentaion/screen/add_account_mangment_responsive.dart`) and `ResponsiveUserManagement` (`feature/UserManagement/presentation/view/screen/responsive_usermangment.dart`) are confirmed never instantiated outside their own file — dead code, not reachable from any sidebar entry or route. Do not port; see Section 11 for the full dead/superseded-screen list.

---

## 11. Phase 2 / Optional

Short summaries only — these are either not reachable from the current sidebar, or are explicitly lower-priority per the agreed outline.

- **كشف حساب الأعضاء (Member Account Statement)** — `ResponsiveMembersAccountStatement`, reachable only via the commented-out 5th Account-Management sidebar sub-item (`bar_cubit.dart:224-229`) or the two-step `finance`-toggle interaction through the orphaned `AccountManagementChoose` hub (Section 6.2). Table: name/phone/address/status/villa-number/edit (`members_account_statement_tablet.dart:63-68`, all `flex:2` except edit `flex:3`), backed by `EndPoint.getAllMemberAccounts`.
- **ملخص السندات بالسنة (Bonds Summary By Year)** — `SummarybondbyyearStatementResponsive`, same reachability caveat as above. Table columns "سنة/مدفوع/متبقي" bound to `year/totalDisbursement/totalReceipt` respectively (`summarybondbyyear_statement_tablet.dart:65-92`) — note the paid/residual labels appear semantically swapped versus the model field names; verify with product before porting the label-to-field mapping as-is. Backed by `EndPoint.getbondssummarybyyearbyvillanumber` (bare array response).
- **سندات إنشاء سند الكمبوند (Compound Disbursement Bond)** — `CreateReceiptBondForCompoundResponsive` / `SummarybondbyyearStatementResponsive` toggle pair under Receipt Vouchers' `finance` flag; backed by `EndPoint.addCompoundDisbursementBond` and `EndPoint.compounddisbursementbonds`.
- **إنشاء سند (general Create Bond)** — the shared create-bond form described in Section 7.6, already live and reachable; included here only because it's the shared basis for the compound-bond variant above.
- **Home / Invitations** — `feature/Home/`, a paginated table/card list of `VisitInvitation` records (`EndPoint.allInvitations`), page size 20. Not present in the current 10-leaf sidebar inventory (Section 6.2) — its reachability from the shipped sidebar was not confirmed in this research pass; treat as Phase 2 pending confirmation.
- **Create Invite** — `feature/create_invite/`, POST `multipart/form-data` to `/Invitation/ownerOneTimeInvitation` (fields: `ReasonForVisit, DateFrom, DateTo, GuestName, GuestPhoneNumber, VillaNumber, GuestPicture?`), response includes a **`qrCode: string`** field (`invitation.dart:14-21`) — confirmed exact field name, to be rendered as a QR image/code in the Angular UI (the Flutter model just carries the string; no QR-rendering code was found in this pass, implying the Flutter UI itself may also just display or encode the string client-side — verify before assuming a ready-made QR asset comes from the backend).
- **ExchangebondsResponsive** — confirmed to construct a hardcoded fake `List<VisitRow>` of 10 identical, semantically-scrambled rows (`exchangebonds_responsive.dart:19-31`, e.g. a `date` field populated with the string `"جنيه مصري"`), but this fake list is **dead/unused** — the actual child widgets (`exchange_bonds_mobile.dart`, `exchange_bond_tablet.dart`) ignore the passed-in `rows` and independently call the real `EndPoint.getallMemberdisbursementBonds` via `PersonCubit.getAllDisbursementBonds`. Do not port the fake-data construction; port only the real API-backed rendering path.
- **`ResponsiveAddBond`** (bonus finding, same category) — a fully separate, standalone screen with hardcoded fake villa data (`responsive_add_bond.dart:81-90`, explicit `// TODO: Later this will come from API` comment) and no submit API call at all (`// TODO: Make POST request here`). Confirmed non-functional prototype; do not port as-is.
- **Superseded/dead screens, confirmed not reachable from any sidebar entry or route**: `AddAccountMangment` (`feature/add_users/presentaion/screen/add_account_mangment_responsive.dart`) and `ResponsiveUserManagement` (`feature/UserManagement/presentation/view/screen/responsive_usermangment.dart`). `feature/users_management` (lowercase) itself is **not** dead — it is live and reachable (Section 3.3/7.5), just intentionally scoped to add+list only, distinct from `feature/UserManagement` (uppercase, villa-resident owners, full CRUD).

---

## Appendix: files referenced in the original research brief that could not be located or verified

- **`web/firebase-messaging-sw.js`** — not found. The delivered source is `F:\Dashboards\lib\lib\` (Dart sources only), with no `pubspec.yaml` and no `web/` platform folder anywhere under `F:\Dashboards\lib\` (confirmed via `Glob` across the whole `lib` project directory). A sibling `__MACOSX/` folder next to `lib/` confirms this is an unzipped subset of a larger project. This file must be sourced from the actual deployed Flutter web build if the Angular FCM/service-worker implementation needs to match it exactly.
- **`intl_ar.arb`** — found (contrary to the brief's uncertainty about its existence/location): `F:\Dashboards\lib\lib\l10n\intl_ar.arb`, alongside `intl_en.arb` and generated `app_localizations*.dart` files, plus a second legacy generated set under `generated/intl/`. Both `.arb` files contain exactly 177 keys (verified by direct count, not estimated).
- Chat search icon wiring and "infinite shimmer on error" (Section 10, issues 15 and 17) — flagged in-line above as unconfirmed rather than asserted, since they could not be pinned to a specific file:line with the same confidence as every other claim in this document within the scope of this research pass.

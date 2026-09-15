/**
 * One canonical Owner shape — resolves spec §1.5 row 2 (two incompatible
 * Flutter `OwnerModel`s: `villaNumber` as `int` in `add_users/ownermodel.dart`
 * vs `String` in `UserManagement/owner_model.dart`, one carrying a `token`
 * field that never belongs on a display model, one carrying `id`). This
 * interface is what every Owners screen/service in this app uses; `villaNumber`
 * is always `number`, converted at the API boundary in `owners-api.service.ts`.
 */
export interface Owner {
  id: number;
  email: string;
  userName: string;
  phoneNumber: string;
  villaAddress: string;
  villaLocation: string;
  villaNumber: number;
  villaSpace: string;
  villaStreet: string;
  villaFloorsNumber: number;
  /** Raw `pictureUrl` from the backend — resolve with `resolveOwnerAvatarUrl()`, never render directly. */
  pictureUrl: string | null;
}

/** `POST /Dashboard/addMember` request body (spec §3.2) — multipart form fields, PascalCase keys preserved verbatim. */
export interface CreateOwnerRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  villaAddress: string;
  villaLocation: string;
  VillaNumber: string;
  VillaSpace: string;
  villaStreet: string;
  villaFloorsNumber: number;
  image?: File | null;
}

/** `PUT /Dashboard/updateMember` request body (spec §3.2) — multipart, PascalCase keys verbatim. */
export interface UpdateOwnerRequest {
  Id: number;
  Email: string;
  Name: string;
  PhoneNumber: string;
  Password: string;
  VillaAddress: string;
  VillaNumber: number;
  VillaLocation: string;
  VillaSpace: string;
  VillaStreet: string;
  VillaFloorsNumber: number;
  Image?: File | null;
}

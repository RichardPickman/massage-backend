import { User } from "../types";

export default class UserDto {
  email: string;
  id: string;
  isActivated: boolean;
  role: string;
  nickname: string;

  constructor(model) {
    this.id = model._id;
    this.nickname = model.nickname;
    this.email = model.email;
    this.isActivated = model.isActivated;
    this.role = model.role;
  }
}

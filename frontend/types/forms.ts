export interface SignupForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface User {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
}

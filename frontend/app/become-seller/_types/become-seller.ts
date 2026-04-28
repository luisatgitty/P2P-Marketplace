export type VerifyStep = 1 | 2 | 3;
export type IdType =
  | ''
  | 'philsys'
  | 'postal'
  | 'drivers'
  | 'prc'
  | 'passport'
  | 'sss'
  | 'gsis'
  | 'hdmf'
  | 'voters'
  | 'acr';

export type VerificationImagePayload = {
  name: string;
  mimeType: string;
  data: string;
};

export type SubmitVerificationPayload = {
  idType: string;
  idNumber: string;
  idFirstName: string;
  idLastName: string;
  idBirthdate: string;
  mobileNumber: string;
  userAgent: string;
  ipAddress: string;
  hardwareInfo: string;
  idImageFront: VerificationImagePayload;
  idImageBack: VerificationImagePayload;
  selfieImage: VerificationImagePayload;
};

export interface CameraInputProps {
  label: string;
  capture: 'environment' | 'user';
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (f: File | null) => void;
}
export { AuthLayout } from "./components/AuthLayout";
export { LoginView } from "./views/LoginView";
export { RegisterView } from "./views/RegisterView";
export { ForgotPasswordView } from "./views/ForgotPasswordView";
export { ResetPasswordView } from "./views/ResetPasswordView";
export { VerifyEmailPendingView } from "./views/VerifyEmailPendingView";
export { VerifyOtpView } from "./views/VerifyOtpView";
export {
  useAuth,
  useLogin,
  useRegister,
  useLogout,
  useForgotPassword,
  useResetPassword,
  useVerifyEmailConfirm,
  useResendVerification,
  useVerifyOtp,
  useResendOtp,
  useChangePassword,
  useUpdateProfile,
  authKeys,
} from "./hooks/useAuth";
export { authService, oauthStartUrl } from "./services/authService";
export type {
  User,
  AuthResponse,
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailConfirmInput,
  VerifyOtpInput,
  ChangePasswordInput,
  UpdateProfileInput,
  OAuthProvider,
} from "./types";

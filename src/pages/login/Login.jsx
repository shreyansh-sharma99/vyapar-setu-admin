import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Package, ShoppingBag, Truck } from 'lucide-react';
import Logo from '@/components/Logo';
import { loginUser } from '@/pages/login/services/authSlice';
import { Alert, Button, Field, Input, Label, Modal } from '@/components/ui';
import { forgotPasswordApi } from '@/pages/login/services/authService';
import { getHomePath } from '@/utility/shopPermissions';

export default function Login() {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const loginEmail = watch("email");
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error, isAuthenticated, user } = useSelector((state) => state.auth);
    const [showPassword, setShowPassword] = useState(false);
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotMessage, setForgotMessage] = useState(null);

    const handleOpenForgotModal = () => {
        setForgotEmail(loginEmail || '');
        setIsForgotModalOpen(true);
        setIsAnimating(true);
    };

    const handleCloseForgotModal = () => {
        setIsAnimating(false);
        setTimeout(() => {
            setIsForgotModalOpen(false);
        }, 200);
    };

    useEffect(() => {
        if (isAuthenticated) {
            // Staff without dashboard access land on the first page their role allows.
            navigate(getHomePath(user), { replace: true });
        }
    }, [isAuthenticated, user, navigate]);

    const onSubmit = (data) => {
        dispatch(loginUser(data));
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        setForgotMessage(null);
        try {
            await forgotPasswordApi({ email: forgotEmail });
            setForgotMessage({ type: 'success', text: 'Password reset link sent to your email.' });
            setTimeout(() => {
                handleCloseForgotModal();
                setForgotMessage(null);
                setForgotEmail('');
            }, 3000);
        } catch (err) {
            setForgotMessage({ type: 'error', text: err.response?.data?.message || 'Failed to send reset link.' });
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-x-hidden bg-page bg-gradient-to-b from-info-soft via-brand-soft to-brand-soft transition-colors duration-300">

            {/* ── Desktop: animated delivery street fills the screen ── */}
            <img
                src="/image/login-hero.svg"
                alt=""
                aria-hidden="true"
                className="hidden lg:block absolute inset-0 w-full h-full object-cover object-left-bottom select-none pointer-events-none"
            />
            {/* The page colour washes over the scene: white on the right in light mode, navy (dimmed scene) in dark mode. */}
            <div className="hidden lg:block absolute inset-0 pointer-events-none bg-page/10" />
            <div className="hidden lg:block absolute inset-0 pointer-events-none bg-gradient-to-l from-page/60 via-page/0 to-transparent" />
            <main className="relative z-10 flex min-h-screen flex-col lg:flex-row lg:items-center lg:justify-end lg:px-12 xl:px-24">

                {/* ── Mobile & tablet: scene as a banner above the form ── */}
                <div className="lg:hidden px-4 pt-6 sm:pt-10">
                    <img
                        src="/image/login-scene-2.svg"
                        alt=""
                        aria-hidden="true"
                        className="mx-auto w-full max-w-[560px] max-h-[38vh] object-contain object-bottom select-none pointer-events-none"
                    />
                </div>

                {/* ── Sign-in card ── */}
                <section
                    className="relative -mt-4 lg:mt-0 flex-1 lg:flex-none w-full sm:mx-auto sm:mb-10 sm:max-w-xl lg:mx-0 lg:mb-0 lg:w-[440px]
                        rounded-t-[2rem] sm:rounded-[2rem]
                        bg-surface/95 lg:bg-surface/80 lg:backdrop-blur-xl
                        border border-line
                        shadow-[0_-12px_40px_rgba(79,70,229,0.12)] lg:shadow-[0_30px_80px_rgba(30,27,75,0.25)]
                        px-6 py-8 sm:px-10 sm:py-10"
                >
                    <div className="mx-auto w-full max-w-[380px]">

                        <Logo className="h-11 w-auto mb-8" />

                        {/* Heading */}
                        <div className="mb-6">
                            <h1 className="text-3xl sm:text-4xl font-extrabold !text-ink tracking-tight mb-2">
                                Welcome back
                            </h1>
                            <p className="text-sm text-ink-muted">
                                Sign in to manage your shop, stock and deliveries.
                            </p>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <Alert tone="danger" className="mb-6">
                                {error}
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

                            <Field label="Email" error={errors.email?.message}>
                                <Input
                                    {...register("email", {
                                        required: "Email is required",
                                        pattern: { value: /^\S+@\S+$/i, message: "Invalid format" },
                                    })}
                                    type="email"
                                    autoComplete="email"
                                    placeholder="name@company.com"
                                    startIcon={<Mail />}
                                    error={errors.email}
                                />
                            </Field>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label htmlFor="login-password" className="mb-0">
                                        Password
                                    </Label>
                                    <Button variant="link" size="xs" onClick={handleOpenForgotModal} className="hover:text-highlight">
                                        Forgot Password?
                                    </Button>
                                </div>
                                <Input
                                    {...register("password", {
                                        required: "Password is required",
                                        minLength: { value: 6, message: "At least 6 characters required" },
                                    })}
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    startIcon={<Lock />}
                                    className="pr-12"
                                    endIcon={
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff /> : <Eye />}
                                        </Button>
                                    }
                                    error={errors.password}
                                />
                                {errors.password && (
                                    <p role="alert" className="m-0 mt-1.5 text-xs font-medium text-danger">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            <div className="pt-2">
                                <Button type="submit" size="lg" fullWidth loading={loading}>
                                    {loading ? "Authenticating..." : "Sign In to Dashboard"}
                                </Button>
                            </div>

                        </form>

                        {/* What the shop runs on */}
                        <div className="mt-8 grid grid-cols-3 gap-2">
                            {[
                                { icon: Package, label: 'Inventory', tone: 'bg-brand-soft text-brand-ink' },
                                { icon: ShoppingBag, label: 'Orders', tone: 'bg-highlight-soft text-highlight' },
                                { icon: Truck, label: 'Deliveries', tone: 'bg-success-soft text-success' },
                            ].map(({ icon: Icon, label, tone }) => (
                                <div key={label} className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-semibold ${tone}`}>
                                    <Icon className="w-4 h-4" />
                                    {label}
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 text-center text-xs text-ink-subtle">
                            © {new Date().getFullYear()} ecnbiz. All rights reserved.
                        </div>
                    </div>
                </section>
            </main>

            {/* Forgot Password Modal */}
            <Modal
                open={isForgotModalOpen}
                onClose={handleCloseForgotModal}
                closeOnBackdrop={false}
                className={isAnimating ? undefined : 'modal-content-exit'}
                title="Reset Password"
                subtitle="Enter your email address and we'll send you a link to reset your password."
            >
                {forgotMessage && (
                    <Alert tone={forgotMessage.type === 'success' ? 'success' : 'danger'} className="mb-4">
                        {forgotMessage.text}
                    </Alert>
                )}

                <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                    <Field label="Email Address">
                        <Input
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            type="email"
                            autoComplete="email"
                            placeholder="name@company.com"
                            startIcon={<Mail />}
                            required
                        />
                    </Field>
                    <Button
                        type="submit"
                        size="lg"
                        fullWidth
                        disabled={!forgotEmail.trim()}
                        loading={forgotLoading}
                    >
                        {forgotLoading ? "Sending Link..." : "Send Reset Link"}
                    </Button>
                </form>
            </Modal>
        </div>
    );
}

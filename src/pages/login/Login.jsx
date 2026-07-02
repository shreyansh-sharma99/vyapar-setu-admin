import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { loginUser } from '@/pages/login/services/authSlice';
import { Label } from '@/components/inputs/Label';
import { Input } from '@/components/inputs/Input';
import Button from '@/components/inputs/Button';
import { forgotPasswordApi } from '@/pages/login/services/authService';

export default function Login() {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const loginEmail = watch("email");
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
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
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

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
        <div className="min-h-screen bg-slate-100 dark:bg-[#060b18] flex items-center justify-center p-4 transition-colors duration-300">

            {/* ── Ambient background glows ── */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div
                    className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)' }}
                />
                <div
                    className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }}
                />
            </div>

            {/* ── Card ── */}
            <div
                className="relative z-10 w-full max-w-[960px] min-h-[580px] flex overflow-hidden rounded-[2rem] border border-indigo-200 dark:border-indigo-500/[0.15] bg-white dark:bg-transparent shadow-xl dark:shadow-none"
                style={{
                    boxShadow: undefined,
                }}
            >
                {/* Dark-mode card gradient overlay */}
                <div
                    className="absolute inset-0 rounded-[2rem] pointer-events-none hidden dark:block"
                    style={{
                        background: 'linear-gradient(135deg, #0d1526 0%, #0f172a 60%, #0a1020 100%)',
                        boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
                    }}
                />

                {/* ── LEFT: Branding ── */}
                <div
                    className="hidden md:flex w-[48%] flex-col items-center justify-center p-12 relative overflow-hidden border-r border-indigo-100 dark:border-indigo-500/10 bg-indigo-50 dark:bg-transparent"
                >
                    {/* Light-mode soft gradient */}
                    <div
                        className="absolute inset-0 pointer-events-none dark:hidden"
                        style={{ background: 'linear-gradient(160deg, #eef2ff 0%, #e0e7ff 50%, #f5f3ff 100%)' }}
                    />
                    {/* Dark-mode gradient */}
                    <div
                        className="absolute inset-0 pointer-events-none hidden dark:block"
                        style={{ background: 'linear-gradient(160deg, #0d1a3a 0%, #0a1228 50%, #060e1e 100%)' }}
                    />

                    {/* Glow blobs */}
                    <div
                        className="absolute top-[-15%] left-[-15%] w-[70%] h-[70%] rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.20) 0%, transparent 70%)' }}
                    />
                    <div
                        className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)' }}
                    />

                    <img
                        src="/image/logos/newLogo.png"
                        alt="VyaparSetu Logo"
                        className="w-full max-w-[220px] object-contain relative z-10 mb-8"
                        style={{ filter: 'drop-shadow(0 0 30px rgba(99,102,241,0.35))' }}
                    />

                    <div className="text-center relative z-10">
                        <h2 className="text-2xl font-bold text-indigo-900 dark:!text-white mb-3 tracking-tight">
                            Welcome to {import.meta.env.VITE_PLATFORM_NAME}
                        </h2>
                        <p className="text-sm text-indigo-600/70 dark:text-white/50">
                            Log in to manage your inventory, analyze sales, and oversee operations seamlessly.
                        </p>
                    </div>
                </div>

                {/* ── RIGHT: Form ── */}
                <div className="flex-1 flex flex-col justify-center p-8 sm:p-12 relative z-10">
                    <div className="max-w-[360px] mx-auto w-full">

                        {/* Heading */}
                        <div className="mb-6">
                            <h1 className="text-4xl font-extrabold text-slate-900 dark:!text-white tracking-tighter mb-2">
                                Sign In
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-white/40">
                                Enter your credentials to access your account.
                            </p>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="px-4 py-3 mb-6 bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-300 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

                            <div>
                                <Label >Email</Label>
                                <Input
                                    {...register("email", {
                                        required: "Email is required",
                                        pattern: { value: /^\S+@\S+$/i, message: "Invalid format" },
                                    })}
                                    type="email"
                                    placeholder="name@company.com"
                                    startIcon={<Mail className="w-4 h-4" />}
                                    error={errors.email}
                                />
                                {errors.email && (
                                    <p className="text-red-600 dark:text-red-300 text-xs mt-1.5">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label>
                                        Password
                                    </Label>
                                    <button
                                        type="button"
                                        onClick={handleOpenForgotModal}
                                        className="text-xs font-semibold text-indigo-600 dark:!text-white hover:text-indigo-500 transition-colors duration-200 bg-transparent border-none cursor-pointer"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                                <Input
                                    {...register("password", {
                                        required: "Password is required",
                                        minLength: { value: 6, message: "At least 6 characters required" },
                                    })}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    startIcon={<Lock className="w-4 h-4" />}
                                    endIcon={
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="p-1 rounded-md text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/80 transition-colors duration-200 bg-transparent border-none cursor-pointer flex items-center"
                                        >
                                            {showPassword
                                                ? <EyeOff className="w-4 h-4" />
                                                : <Eye className="w-4 h-4" />}
                                        </button>
                                    }
                                    error={errors.password}
                                />
                                {errors.password && (
                                    <p className="text-red-600 dark:text-red-300 text-xs mt-1.5">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    variant="login"
                                    disabled={loading}
                                    startIcon={loading ? <Loader2 className="w-5 h-5 animate-spin" /> : undefined}
                                >
                                    {loading ? "Authenticating..." : "Sign In to Dashboard"}
                                </Button>
                            </div>

                        </form>
                    </div>
                </div>

            </div>

            {/* Forgot Password Modal */}
            {isForgotModalOpen && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${isAnimating ? 'modal-backdrop-enter' : 'modal-backdrop-exit'}`}>
                    <div className={`bg-[var(--vs-bg-primary)] rounded-2xl p-6 w-full max-w-md shadow-2xl border border-[var(--vs-border)] relative ${isAnimating ? 'modal-content-enter' : 'modal-content-exit'}`}>
                        <button
                            onClick={handleCloseForgotModal}
                            className="absolute top-4 right-4 text-[var(--vs-text-secondary)] hover:text-[var(--vs-text-primary)] bg-transparent border-none cursor-pointer"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h3 className="text-xl font-bold text-[var(--vs-text-primary)] mb-2 dark:!text-white">Reset Password</h3>
                        <p className="text-sm text-[var(--vs-text-secondary)] mb-6">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>

                        {forgotMessage && (
                            <div className={`px-4 py-3 mb-4 rounded-xl text-sm text-center ${forgotMessage.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'}`}>
                                {forgotMessage.text}
                            </div>
                        )}

                        <form onSubmit={handleForgotSubmit}>
                            <div className="mb-4">
                                <Label>Email Address</Label>
                                <Input
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    type="email"
                                    placeholder="name@company.com"
                                    startIcon={<Mail className="w-4 h-4" />}
                                    required
                                    className="bg-[var(--vs-input-bg)] border-[var(--vs-input-border)] text-[var(--vs-text-primary)]"
                                />
                            </div>
                            <Button
                                type="submit"
                                variant="login"
                                disabled={forgotLoading || !forgotEmail.trim()}
                                startIcon={forgotLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : undefined}
                                className="w-full flex justify-center items-center"
                            >
                                {forgotLoading ? "Sending Link..." : "Send Reset Link"}
                            </Button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

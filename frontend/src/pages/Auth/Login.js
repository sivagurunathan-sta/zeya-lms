import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { loginUser, clearError, demoLoginAdmin, demoLoginStudent } from '../../store/slices/authSlice';
import Button from '../../components/UI/Button';
import Input from '../../components/Form/Input';
import FormError from '../../components/Form/FormError';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm();

  const from = location.state?.from?.pathname || '/dashboard';

  const onSubmit = async (data) => {
    dispatch(clearError());
    if (data.email === 'admin@example.com' && data.password === 'admin123') {
      dispatch(demoLoginAdmin());
      navigate('/admin', { replace: true });
      return;
    }
    if (data.email === 'student@example.com' && data.password === 'student123') {
      dispatch(demoLoginStudent());
      navigate('/dashboard', { replace: true });
      return;
    }
    const result = await dispatch(loginUser(data));
    if (result.type === 'auth/login/fulfilled') {
      const next = result.payload?.user?.role === 'ADMIN' ? '/admin' : from;
      navigate(next, { replace: true });
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
        <p className="text-gray-600 mt-2">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Email address"
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          })}
          error={errors.email?.message}
          placeholder="Enter your email"
        />

        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters'
              }
            })}
            error={errors.password?.message}
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
              Remember me
            </label>
          </div>

          <Link to="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
            Forgot password?
          </Link>
        </div>

        {error && <FormError message={error} />}

        <Button
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
        >
          Sign in
        </Button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={() => { setValue('email','admin@example.com'); setValue('password','admin123'); }}>
            Use Admin Demo Credentials
          </Button>
          <Button type="button" variant="secondary" onClick={() => { setValue('email','student@example.com'); setValue('password','student123'); }}>
            Use Student Demo Credentials
          </Button>
          <Button type="button" onClick={() => { dispatch(demoLoginAdmin()); navigate('/admin', { replace: true }); }}>
            One-click Admin Login
          </Button>
          <Button type="button" onClick={() => { dispatch(demoLoginStudent()); navigate('/dashboard', { replace: true }); }}>
            One-click Student Login
          </Button>
        </div>

        <div className="text-center">
          <span className="text-gray-600">Don't have an account? </span>
          <Link to="/auth/register" className="text-blue-600 hover:text-blue-500 font-medium">
            Sign up
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Login;

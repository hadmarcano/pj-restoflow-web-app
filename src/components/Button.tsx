import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './ui.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'amber';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: styles.btnPrimary,
  secondary: styles.btnSecondary,
  ghost: styles.btnGhost,
  danger: styles.btnDanger,
  amber: styles.btnAmber,
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    className={[
      styles.btn,
      variantClass[variant],
      size === 'sm' ? styles.btnSm : '',
      fullWidth ? styles.btnFull : '',
      className || '',
    ].join(' ')}
    disabled={disabled || loading}
    {...rest}
  >
    {loading && <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />}
    {children}
  </button>
);

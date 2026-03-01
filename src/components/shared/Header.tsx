import { Moon, Sun, Bell, Menu, User, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { getTheme, transitions, borderRadius } from '../../theme/tokens';

interface HeaderProps {
  currentPageTitle: string;
  onMenuClick: () => void;
}

export const Header = ({ currentPageTitle, onMenuClick }: HeaderProps) => {
  const { theme: themeMode, isDarkMode, toggleTheme } = useTheme();
  const theme = getTheme(isDarkMode);
  const { profile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const headerStyles: React.CSSProperties = {
    height: '4rem',
    backgroundColor: theme.background.card,
    borderBottom: `1px solid ${theme.border.default}`,
    padding: '0 1.5rem'
  };

  const iconButtonStyles: React.CSSProperties = {
    padding: '0.5rem',
    borderRadius: borderRadius.DEFAULT,
    backgroundColor: 'transparent',
    color: theme.text.secondary,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.DEFAULT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  return (
    <header style={headerStyles}>
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onMenuClick}
            style={{
              ...iconButtonStyles,
              display: 'flex',
            }}
            className="md:hidden"
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.background.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: theme.text.primary
          }}>
            {currentPageTitle}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            style={{
              ...iconButtonStyles,
              position: 'relative'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.background.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Bell className="w-5 h-5" />
            <span style={{
              position: 'absolute',
              top: '0.375rem',
              right: '0.375rem',
              width: '0.5rem',
              height: '0.5rem',
              backgroundColor: theme.status.error.main,
              borderRadius: '50%'
            }} />
          </button>

          <button
            onClick={toggleTheme}
            style={iconButtonStyles}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.background.hover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {themeMode === 'light' ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem 0.5rem 0.5rem',
                borderRadius: borderRadius.DEFAULT,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: transitions.DEFAULT
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.background.hover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '2rem',
                height: '2rem',
                backgroundColor: theme.primary.main,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <User style={{ width: '1rem', height: '1rem', color: theme.text.inverse }} />
              </div>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: theme.text.primary
              }} className="hidden sm:block">
                {profile?.full_name}
              </span>
            </button>

            {showUserMenu && (
              <div style={{
                position: 'absolute',
                left: '0',
                marginTop: '0.5rem',
                width: '14rem',
                backgroundColor: theme.background.card,
                borderRadius: borderRadius.DEFAULT,
                boxShadow: theme.shadow.lg,
                border: `1px solid ${theme.border.default}`,
                padding: '0.5rem 0',
                zIndex: 50
              }}>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderBottom: `1px solid ${theme.border.default}`
                }}>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: theme.text.primary
                  }}>
                    {profile?.full_name}
                  </p>
                  <p style={{
                    fontSize: '0.75rem',
                    color: theme.text.muted,
                    marginTop: '0.25rem'
                  }}>
                    {profile?.email}
                  </p>
                </div>

                <button style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 1rem',
                  textAlign: 'right',
                  color: theme.text.primary,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: transitions.DEFAULT
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.background.hover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <User style={{ width: '1rem', height: '1rem' }} />
                  <span style={{ fontSize: '0.875rem' }}>الملف الشخصي</span>
                </button>

                <button style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 1rem',
                  textAlign: 'right',
                  color: theme.text.primary,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: transitions.DEFAULT
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.background.hover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <SettingsIcon style={{ width: '1rem', height: '1rem' }} />
                  <span style={{ fontSize: '0.875rem' }}>الإعدادات</span>
                </button>

                <div style={{
                  borderTop: `1px solid ${theme.border.default}`,
                  marginTop: '0.5rem',
                  paddingTop: '0.5rem'
                }}>
                  <button
                    onClick={signOut}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.625rem 1rem',
                      textAlign: 'right',
                      color: theme.status.error.main,
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: transitions.DEFAULT
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.status.error.light}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <LogOut style={{ width: '1rem', height: '1rem' }} />
                    <span style={{ fontSize: '0.875rem' }}>تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

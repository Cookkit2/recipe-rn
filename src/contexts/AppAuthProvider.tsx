import { AuthProvider } from '~/src/contexts/AuthContext';

export const AppAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

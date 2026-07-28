import './globals.css';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from '@/components/CartProvider';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'Toys2000 — Wholesale Portal',
  description: 'Place wholesale orders from your favorite toy and gift brands.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Pacifico&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <CartProvider>
          <AppShell>{children}</AppShell>
        </CartProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3500,
            style: { fontFamily: "'Nunito', sans-serif", fontSize: '14px' },
          }}
        />
      </body>
    </html>
  );
}

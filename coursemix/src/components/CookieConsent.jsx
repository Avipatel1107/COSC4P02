'use client';

import { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // Check if cookies are enabled
    const cookiesEnabled = navigator.cookieEnabled;
    const consentShown = document.cookie.includes('cookie_consent=true');
    const consentShownBefore = document.cookie.includes('cookie_consent_shown=true');

    if (!cookiesEnabled || (!consentShown && !consentShownBefore)) {
      setShowConsent(true);
    }
  }, []);

  const handleAccept = () => {
    // Set cookie consent
    document.cookie = 'cookie_consent=true; max-age=31536000; path=/';
    document.cookie = 'cookie_consent_shown=true; max-age=31536000; path=/';
    setShowConsent(false);
  };

  const handleDecline = () => {
    // Mark that we've shown the consent
    document.cookie = 'cookie_consent_shown=true; max-age=31536000; path=/';
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 p-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Cookie Settings</h3>
          <p className="mt-1 text-sm text-gray-600">
            We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
            These cookies are necessary for the website to function properly.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700"
          >
            Accept All Cookies
          </button>
          <button
            onClick={handleDecline}
            className="text-gray-400 hover:text-gray-500"
            aria-label="Close"
          >
            <XCircle size={24} />
          </button>
        </div>
      </div>
    </div>
  );
} 
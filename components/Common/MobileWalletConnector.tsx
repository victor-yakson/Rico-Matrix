// components/MobileWalletConnector.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import QRCode from 'react-qr-code';
import { WalletId } from '@/types/wallet';
import { WALLETS } from '@/config/wallets';
import { DeeplinkService } from '@/services/deeplink';
import { isMobile, detectPlatform } from '@/utils/platform';
import styles from './MobileWalletConnector.module.css';

interface DesktopConnectionOptions {
  showQRCode: boolean;
  qrCodeValue: string;
  showDesktopModal: boolean;
}

interface MobileWalletConnectorProps {
  onConnectionSuccess?: (address: string) => void;
  onConnectionError?: (error: Error) => void;
}

const MobileWalletConnector: React.FC<MobileWalletConnectorProps> = ({
  onConnectionSuccess,
  onConnectionError
}) => {
  const { openConnectModal } = useConnectModal();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletId | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'redirecting'>('idle');
  const [desktopOptions, setDesktopOptions] = useState<DesktopConnectionOptions>({
    showQRCode: false,
    qrCodeValue: '',
    showDesktopModal: false
  });

  const qrCodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mobileCheck = isMobile();
    setIsMobileDevice(mobileCheck);
    
    // Generate QR code value
    const generateQRCodeValue = () => {
      const currentUrl = window.location.href;
      // Add timestamp to make QR code dynamic
      return `${currentUrl}?t=${Date.now()}`;
    };

    setDesktopOptions(prev => ({
      ...prev,
      qrCodeValue: generateQRCodeValue()
    }));

    // Check for returning connection
    const checkReturningConnection = () => {
      const preferredWallet = localStorage.getItem('preferredWallet') as WalletId;
      const connectionTime = localStorage.getItem('connectionTime');
      
      if (preferredWallet && connectionTime) {
        const timeSinceConnection = Date.now() - parseInt(connectionTime);
        
        if (timeSinceConnection < 120000) {
          console.log(`User returned after connecting with ${preferredWallet}`);
          // Optional: You can trigger a reconnection or show welcome message
          if (onConnectionSuccess) {
            // In real implementation, you would get the actual address
            // This is just a placeholder
            onConnectionSuccess('0x...');
          }
        }
        
        localStorage.removeItem('preferredWallet');
        localStorage.removeItem('connectionTime');
      }
    };

    checkReturningConnection();
  }, [onConnectionSuccess]);

  const handleWalletSelect = async (walletId: WalletId) => {
    if (!isMobileDevice) return;
    
    setSelectedWallet(walletId);
    setConnectionStatus('connecting');
    
    localStorage.setItem('connectionTime', Date.now().toString());
    
    try {
      await DeeplinkService.openWallet(walletId);
      setConnectionStatus('redirecting');
      
      setTimeout(() => {
        setShowModal(false);
        setConnectionStatus('idle');
        setSelectedWallet(null);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to open wallet:', error);
      setConnectionStatus('idle');
      setSelectedWallet(null);
      onConnectionError?.(error as Error);
    }
  };

  const handleDesktopConnect = () => {
    if (openConnectModal) {
      // Use RainbowKit's modal for desktop
      openConnectModal();
    } else {
      // Show custom desktop modal
      setDesktopOptions(prev => ({
        ...prev,
        showDesktopModal: true
      }));
    }
  };

  const handleDesktopQRCode = () => {
    setDesktopOptions(prev => ({
      ...prev,
      showQRCode: !prev.showQRCode
    }));
  };

  const handleDownloadQRCode = () => {
    if (!qrCodeRef.current) return;
    
    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;
    
    // Clone the SVG to avoid modifying the original
    const svgClone = svg.cloneNode(true) as SVGElement;
    
    // Set background color
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', '#ffffff');
    svgClone.insertBefore(bgRect, svgClone.firstChild);
    
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // Get SVG dimensions
    const size = parseInt(svg.getAttribute('width') || '200');
    canvas.width = size;
    canvas.height = size;
    
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `dapp-qr-${Date.now()}.png`;
        downloadLink.href = pngFile;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const DesktopConnectionModal = () => (
    <div className={styles.desktopModalOverlay}>
      <div className={styles.desktopModal}>
        <div className={styles.desktopModalHeader}>
          <h2>Connect on Desktop</h2>
          <button
            onClick={() => setDesktopOptions(prev => ({ ...prev, showDesktopModal: false }))}
            className={styles.closeButton}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.desktopModalContent}>
          <div className={styles.desktopOptions}>
            <div className={styles.optionCard}>
              <div className={styles.optionIcon}>🔌</div>
              <h3>Browser Extension</h3>
              <p>Connect using MetaMask, Rainbow, or other browser wallet extensions</p>
              <button
                onClick={() => {
                  if (openConnectModal) {
                    openConnectModal();
                    setDesktopOptions(prev => ({ ...prev, showDesktopModal: false }));
                  }
                }}
                className={styles.optionButton}
              >
                Connect with Extension
              </button>
            </div>

            <div className={styles.optionCard}>
              <div className={styles.optionIcon}>📱</div>
              <h3>Mobile QR Code</h3>
              <p>Scan QR code with your mobile wallet app</p>
              <button
                onClick={handleDesktopQRCode}
                className={styles.optionButton}
              >
                {desktopOptions.showQRCode ? 'Hide QR Code' : 'Show QR Code'}
              </button>
            </div>

            <div className={styles.optionCard}>
              <div className={styles.optionIcon}>📲</div>
              <h3>Mobile Deep Link</h3>
              <p>Open this page on your mobile device for automatic wallet connection</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('URL copied! Paste it in your mobile browser.');
                }}
                className={styles.optionButton}
              >
                Copy Mobile Link
              </button>
            </div>
          </div>

          {desktopOptions.showQRCode && (
            <div className={styles.qrCodeSection}>
              <div className={styles.qrCodeContainer} ref={qrCodeRef}>
                <QRCode
                  value={desktopOptions.qrCodeValue}
                  size={200}
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  level="Q"
                />
              </div>
              <p className={styles.qrCodeInstruction}>
                Scan this QR code with your mobile wallet camera
              </p>
              <div className={styles.qrCodeActions}>
                <button
                  onClick={handleDownloadQRCode}
                  className={styles.qrActionButton}
                >
                  Download QR Code
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText(desktopOptions.qrCodeValue)}
                  className={styles.qrActionButton}
                >
                  Copy Link
                </button>
                <button
                  onClick={() => {
                    setDesktopOptions(prev => ({
                      ...prev,
                      qrCodeValue: `${window.location.href}?t=${Date.now()}`
                    }));
                  }}
                  className={styles.qrActionButton}
                >
                  Refresh QR
                </button>
              </div>
            </div>
          )}

          <div className={styles.desktopHelp}>
            <h4>Need Help?</h4>
            <ul>
              <li>Ensure your wallet extension is installed and unlocked</li>
              <li>Make sure you're on the correct network</li>
              <li>Try refreshing the page if connection fails</li>
              <li>For mobile, visit this URL on your phone</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const MobileWalletOptions = () => (
    <div className={styles.mobileWalletOptions}>
      <div className={styles.modalHeader}>
        <h2>Select Wallet</h2>
        <button
          onClick={() => setShowModal(false)}
          className={styles.closeButton}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className={styles.modalContent}>
        <p className={styles.modalDescription}>
          Choose a wallet app to connect. The app will open automatically.
        </p>

        <div className={styles.walletGrid}>
          {DeeplinkService.getRecommendedWallets().map((walletId) => {
            const wallet = WALLETS[walletId];
            return (
              <button
                key={wallet.id}
                onClick={() => handleWalletSelect(wallet.id as WalletId)}
                className={styles.walletButton}
                disabled={connectionStatus !== 'idle'}
              >
                <div className={styles.walletIcon}>
                  <img 
                    src={wallet.icon} 
                    alt={`${wallet.name} logo`}
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="%23ccc"/></svg>';
                    }}
                  />
                </div>
                <span className={styles.walletName}>{wallet.name}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.allWalletsSection}>
          <h3 className={styles.sectionTitle}>Other Wallets</h3>
          <div className={styles.allWalletsList}>
            {Object.values(WALLETS)
              .filter(wallet => !DeeplinkService.getRecommendedWallets().includes(wallet.id as WalletId))
              .map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletSelect(wallet.id as WalletId)}
                  className={styles.altWalletButton}
                  disabled={connectionStatus !== 'idle'}
                >
                  <img 
                    src={wallet.icon} 
                    alt=""
                    className={styles.altWalletIcon}
                  />
                  <span>{wallet.name}</span>
                </button>
              ))}
          </div>
        </div>

        <div className={styles.helpSection}>
          <p className={styles.helpText}>
            <strong>How it works:</strong><br />
            1. Select your wallet app<br />
            2. The app will open automatically<br />
            3. Approve the connection in your wallet<br />
            4. Return to this page
          </p>
          <p className={styles.helpText}>
            Don't have a wallet?{' '}
            <a 
              href="https://ethereum.org/en/wallets/" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.helpLink}
            >
              Learn about wallets
            </a>
          </p>
        </div>
      </div>
    </div>
  );

  if (!isMobileDevice) {
    return (
      <div className={styles.desktopContainer}>
        <button
          onClick={handleDesktopConnect}
          className={styles.desktopButton}
          disabled={connectionStatus !== 'idle'}
        >
          <span className={styles.desktopButtonIcon}>🦊</span>
          <span className={styles.desktopButtonText}>
            {connectionStatus === 'idle' ? 'Connect Wallet' : 'Connecting...'}
          </span>
          <span className={styles.desktopButtonBadge}>Desktop</span>
        </button>

        <p className={styles.desktopHint}>
          Use browser extension or scan QR code with mobile wallet
        </p>

        <button
          onClick={handleDesktopQRCode}
          className={styles.qrToggleButton}
        >
          {desktopOptions.showQRCode ? 'Hide QR Code' : 'Show Mobile QR Code'}
        </button>

        {desktopOptions.showQRCode && (
          <div className={styles.desktopQRCode}>
            <div className={styles.qrCodeWrapper}>
              <QRCode
                value={desktopOptions.qrCodeValue}
                size={150}
                bgColor="#FFFFFF"
                fgColor="#000000"
                level="M"
              />
            </div>
            <p className={styles.qrCodeHint}>
              Scan with mobile wallet
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(desktopOptions.qrCodeValue)}
              className={styles.copyLinkButton}
            >
              Copy Link
            </button>
          </div>
        )}

        {desktopOptions.showDesktopModal && <DesktopConnectionModal />}

        {/* Hidden RainbowKit button for extension detection */}
        <div style={{ display: 'none' }}>
          <ConnectButton />
        </div>
      </div>
    );
  }

  // Mobile version
  return (
    <div className={styles.container}>
      <button
        onClick={() => setShowModal(true)}
        className={styles.connectButton}
        disabled={connectionStatus !== 'idle'}
      >
        {connectionStatus === 'idle' ? (
          <>
            <span className={styles.buttonText}>Connect Wallet</span>
            <span className={styles.buttonBadge}>Mobile</span>
          </>
        ) : connectionStatus === 'connecting' ? (
          <span>Opening {selectedWallet ? WALLETS[selectedWallet].name : 'Wallet'}...</span>
        ) : (
          <span>Redirecting to Wallet...</span>
        )}
      </button>

      {showModal && (
        <div className={styles.mobileModalOverlay}>
          <div className={styles.mobileModalBackdrop} onClick={() => setShowModal(false)} />
          <MobileWalletOptions />
        </div>
      )}

      {/* Hidden RainbowKit button for mobile fallback */}
      <div style={{ display: 'none' }}>
        <ConnectButton />
      </div>
    </div>
  );
};

export default MobileWalletConnector;
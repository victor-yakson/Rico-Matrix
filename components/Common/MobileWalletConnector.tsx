/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { ConnectButton, useConnectModal } from "@rainbow-me/rainbowkit";
import { WalletId } from "@/types/wallet";
import { WALLETS } from "@/utils/wallets";
import { DeeplinkService } from "@/services/deeplink";
import { isMobile } from "@/utils/platform";
import styles from "./MobileWalletConnector.module.css";

interface DesktopConnectionOptions {
  showDesktopModal: boolean;
}

interface MobileWalletConnectorProps {
  onConnectionSuccess?: (address: string) => void;
  onConnectionError?: (error: Error) => void;
  /** Extra class to style component differently per placement (header, page, etc.) */
  className?: string;
  /** Text for the desktop button when idle (default: "Connect Wallet") */
  desktopButtonLabel?: string;
  /** Text for the mobile button when idle (default: "Connect Wallet") */
  mobileButtonLabel?: string;
}

/** Portal so the mobile modal isn't constrained by parent layout (important in iframes) */
const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (typeof document === "undefined") return null;
  return ReactDOM.createPortal(children, document.body);
};

const MobileWalletConnector: React.FC<MobileWalletConnectorProps> = ({
  onConnectionSuccess,
  onConnectionError,
  className,
  desktopButtonLabel = "Connect Wallet",
  mobileButtonLabel = "Launch App",
}) => {
  const { openConnectModal } = useConnectModal();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false);

  // Track if we are already inside a wallet in-app browser
  const [isInAppWalletBrowser, setIsInAppWalletBrowser] =
    useState<boolean>(false);

  const [selectedWallet, setSelectedWallet] = useState<WalletId | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "redirecting"
  >("idle");
  const [desktopOptions, setDesktopOptions] =
    useState<DesktopConnectionOptions>({
      showDesktopModal: false,
    });


  useEffect(() => {
    const mobileCheck = isMobile();
    setIsMobileDevice(mobileCheck);

    // Detect if we are inside a wallet's in-app browser
    const detectInAppWalletBrowser = () => {
      if (typeof window === "undefined") return false;

      const ua = navigator.userAgent || "";
      const eth: any = (window as any).ethereum;

      const walletUA =
        /MetaMaskMobile/i.test(ua) ||
        /TrustWallet/i.test(ua) ||
        /SafePal/i.test(ua) ||
        /TokenPocket/i.test(ua) ||
        /OKX/i.test(ua);

      const injectedWallet =
        !!eth &&
        (eth.isMetaMask ||
          eth.isTrust ||
          eth.isSafePal ||
          eth.isTokenPocket ||
          eth.isOKXWallet);

      return walletUA || injectedWallet;
    };

    setIsInAppWalletBrowser(detectInAppWalletBrowser());

    // Check for returning connection
    const checkReturningConnection = () => {
      const preferredWallet = localStorage.getItem(
        "preferredWallet"
      ) as WalletId;
      const connectionTime = localStorage.getItem("connectionTime");

      if (preferredWallet && connectionTime) {
        const timeSinceConnection = Date.now() - parseInt(connectionTime);

        if (timeSinceConnection < 120000) {
          // Optional: you can trigger a reconnection or show welcome message
          if (onConnectionSuccess) {
            // In real implementation, you would get the actual address
            onConnectionSuccess("0x...");
          }
        }

        localStorage.removeItem("preferredWallet");
        localStorage.removeItem("connectionTime");
      }
    };

    checkReturningConnection();
  }, [onConnectionSuccess]);

  // 🔒 Lock scroll inside the iframe/page when the mobile modal is open
  useEffect(() => {
    if (!isMobileDevice || typeof document === "undefined") return;

    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;

    if (showModal) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = originalHtmlOverflow || "";
      document.body.style.overflow = originalBodyOverflow || "";
    }

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow || "";
      document.body.style.overflow = originalBodyOverflow || "";
    };
  }, [showModal, isMobileDevice]);

  const handleWalletSelect = async (walletId: WalletId) => {
    if (!isMobileDevice) return;

    // If we're already inside MetaMask/Trust/etc browser,
    // DO NOT deeplink again. Just show the RainbowKit connect modal.
    if (isInAppWalletBrowser) {
      try {
        if (openConnectModal) {
          openConnectModal();
        } else {
          // fallback basic connect
          (window as any).ethereum?.request?.({
            method: "eth_requestAccounts",
          });
        }
        setShowModal(false);
      } catch (error) {
        console.error("Failed to connect in in-app browser:", error);
        onConnectionError?.(error as Error);
      }
      return;
    }

    // Old behaviour kept for normal mobile browsers (Chrome/Safari/etc)
    setSelectedWallet(walletId);
    setConnectionStatus("connecting");

    localStorage.setItem("connectionTime", Date.now().toString());
    localStorage.setItem("preferredWallet", walletId);

    try {
      await DeeplinkService.openWallet(walletId);
      setConnectionStatus("redirecting");

      setTimeout(() => {
        setShowModal(false);
        setConnectionStatus("idle");
        setSelectedWallet(null);
      }, 1000);
    } catch (error) {
      console.error("Failed to open wallet:", error);
      setConnectionStatus("idle");
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
      setDesktopOptions((prev) => ({
        ...prev,
        showDesktopModal: true,
      }));
    }
  };

  // QR code flow removed

  const DesktopConnectionModal = () => (
    <div className={styles.desktopModalOverlay}>
      <div className={styles.desktopModal}>
        <div className={styles.desktopModalHeader}>
          <h2>Connect on Desktop</h2>
          <button
            onClick={() =>
              setDesktopOptions((prev) => ({
                ...prev,
                showDesktopModal: false,
              }))
            }
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
              <p>
                Connect using MetaMask, Rainbow, or other browser wallet
                extensions
              </p>
              <button
                onClick={() => {
                  if (openConnectModal) {
                    openConnectModal();
                    setDesktopOptions((prev) => ({
                      ...prev,
                      showDesktopModal: false,
                    }));
                  }
                }}
                className={styles.optionButton}
              >
                Connect with Extension
              </button>
            </div>

            <div className={styles.optionCard}>
              <div className={styles.optionIcon}>📲</div>
              <h3>Mobile Deep Link</h3>
              <p>
                Open this page on your mobile device for automatic wallet
                connection
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("URL copied! Paste it in your mobile browser.");
                }}
                className={styles.optionButton}
              >
                Copy Mobile Link
              </button>
            </div>
          </div>

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
          {isInAppWalletBrowser
            ? "You are in a wallet browser. Tap any option below to connect."
            : "Choose a wallet app to connect. The app will open automatically."}
        </p>

        <div className={styles.walletGrid}>
          {DeeplinkService.getRecommendedWallets().map((walletId) => {
            const wallet = WALLETS[walletId];
            return (
              <button
                key={wallet.id}
                onClick={() => handleWalletSelect(wallet.id as WalletId)}
                className={styles.walletButton}
                disabled={connectionStatus !== "idle" && !isInAppWalletBrowser}
              >
                <div className={styles.walletIcon}>
                  <img
                    src={wallet.icon}
                    alt={`${wallet.name} logo`}
                    width={32}
                    height={32}
                    onError={(e) => {
                      e.currentTarget.onerror = null; // avoid infinite loop
                      e.currentTarget.src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23ccc'/%3E%3C/svg%3E";
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
              .filter(
                (wallet) =>
                  !DeeplinkService.getRecommendedWallets().includes(
                    wallet.id as WalletId
                  )
              )
              .map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => handleWalletSelect(wallet.id as WalletId)}
                  className={styles.altWalletButton}
                  disabled={connectionStatus !== "idle" && !isInAppWalletBrowser}
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
            <strong>How it works:</strong>
            <br />
            {isInAppWalletBrowser ? (
              <>
                1. Tap a wallet option below
                <br />
                2. Approve the connection in your wallet
                <br />
                3. You&apos;re ready to use the dApp
              </>
            ) : (
              <>
                1. Select your wallet app
                <br />
                2. The app will open automatically
                <br />
                3. Approve the connection in your wallet
                <br />
                4. Return to this page
              </>
            )}
          </p>
          <p className={styles.helpText}>
            Don&apos;t have a wallet?{" "}
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

  // DESKTOP
  if (!isMobileDevice) {
    return (
      <div className={`${styles.desktopContainer} ${className ?? ""}`}>
        <button
          onClick={handleDesktopConnect}
          className={styles.desktopButton}
          disabled={connectionStatus !== "idle"}
        >
          <span className={styles.desktopButtonIcon}>🦊</span>
          <span className={styles.desktopButtonText}>
            {connectionStatus === "idle" ? desktopButtonLabel : "Connecting..."}
          </span>
          <span className={styles.desktopButtonBadge}>Desktop</span>
        </button>

        <p className={styles.desktopHint}>
          Use browser extension or scan QR code with mobile wallet
        </p>

        {desktopOptions.showDesktopModal && <DesktopConnectionModal />}

        {/* Hidden RainbowKit button for extension detection */}
        <div style={{ display: "none" }}>
          <ConnectButton />
        </div>
      </div>
    );
  }

  // MOBILE
  return (
    <div className={`${styles.container} ${className ?? ""}`}>
      <button
        onClick={() => {
          // If already in MetaMask/Trust/etc browser, skip deeplink modal
          if (isInAppWalletBrowser && openConnectModal) {
            openConnectModal();
          } else {
            setShowModal(true);
          }
        }}
        className={styles.connectButton}
        disabled={connectionStatus !== "idle" && !isInAppWalletBrowser}
      >
        {connectionStatus === "idle" ? (
          <>
            <span className={styles.buttonText}>{mobileButtonLabel}</span>
            <span className={styles.buttonBadge}>Mobile</span>
          </>
        ) : connectionStatus === "connecting" ? (
          <span>
            Opening {selectedWallet ? WALLETS[selectedWallet].name : "Wallet"}
            ...
          </span>
        ) : (
          <span>Redirecting to Wallet...</span>
        )}
      </button>

      {showModal && (
        <ModalPortal>
          <div className={styles.mobileModalOverlay}>
            <div
              className={styles.mobileModalBackdrop}
              onClick={() => setShowModal(false)}
            />
            <MobileWalletOptions />
          </div>
        </ModalPortal>
      )}

      {/* Hidden RainbowKit button for mobile fallback */}
      <div style={{ display: "none" }}>
        <ConnectButton />
      </div>
    </div>
  );
};

export default MobileWalletConnector;

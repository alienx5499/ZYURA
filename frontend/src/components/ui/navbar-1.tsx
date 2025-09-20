import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Menu, X, User, Settings, LogOut, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { useNavigate, useLocation } from "react-router-dom"
import { LiquidButton } from "./liquid-glass-button"
import { Logo } from "./logo"
import { useWallet } from "@/contexts/WalletContext"

const Navbar1 = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const { isConnected, account, connect, disconnect, isLoading } = useWallet()
  const profileRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const toggleMenu = () => setIsOpen(!isOpen)
  const toggleProfile = () => setIsProfileOpen(!isProfileOpen)

  // Close profile dropdown when clicking outside
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }

    if (isProfileOpen) {
      if (typeof document !== 'undefined') {
        document.addEventListener('mousedown', handleClickOutside)
      }
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isProfileOpen])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account)
      toast.success("Address copied to clipboard!", {
        description: `${account.slice(0, 6)}...${account.slice(-4)}`
      })
    }
  }

  const openExplorer = () => {
    if (!account) return
    const net = ((import.meta as unknown) as { env?: Record<string, string> }).env?.VITE_NETWORK || 'localnet'
    // Prefer Pera explorer (stable domains). Fallback to AlgoExplorer for mainnet.
    const url = net === 'testnet'
      ? `https://explorer.perawallet.app/testnet/address/${account}`
      : net === 'mainnet'
        ? `https://explorer.perawallet.app/mainnet/address/${account}`
        : `http://localhost:8980/account/${account}` // LocalNet indexer UI
    window.open(url, '_blank')
  }

  return (
    <div className="flex justify-center w-full py-6 px-4">
      <div className="flex items-center justify-between px-6 py-3 bg-white rounded-full shadow-lg w-full max-w-3xl relative z-10 border border-gray-200 navbar-white">
        <div className="flex items-center">
          <motion.div
            className="mr-6"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <Logo size={28} />
              <span className="text-2xl font-semibold text-gray-900 tracking-tight">ZYURA</span>
            </button>
          </motion.div>
        </div>
        
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {["Home", "Features", "Testimonials", "About"].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <button 
                  onClick={() => {
                    if (item === 'Home') {
                      navigate('/');
                    } else if (item === 'Features' || item === 'Testimonials' || item === 'About') {
                      // Scroll to section on landing page
                      navigate('/');
                      setTimeout(() => {
                        const element = typeof window !== 'undefined' ? document.getElementById(item.toLowerCase()) : null;
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 100);
                    }
                  }}
                  className={`text-sm transition-colors font-medium ${
                    (item === 'Home' && location.pathname === '/') || 
                    (item !== 'Home' && location.pathname === '/')
                      ? 'text-gray-900 hover:text-gray-600'
                      : 'text-gray-900 hover:text-gray-600'
                  }`}
                >
                  {item}
                </button>
              </motion.div>
            ))}
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                whileHover={{ scale: 1.05 }}
              >
                <button 
                  onClick={() => navigate('/dashboard')}
                  className={`text-sm transition-colors font-medium ${
                    location.pathname === '/dashboard' 
                      ? 'text-blue-600' 
                      : 'text-gray-900 hover:text-gray-600'
                  }`}
                >
                  Dashboard
                </button>
              </motion.div>
            )}
          </nav>

        {/* Desktop Wallet Button */}
        <motion.div
          className="hidden md:block relative"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {isConnected ? (
            <div className="relative" ref={profileRef}>
              <LiquidButton
                onClick={toggleProfile}
                size="sm"
                className="px-5 py-2 text-sm"
              >
                Profile
              </LiquidButton>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 top-full mt-2 w-72 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 py-2 z-50"
                  >
                    {/* Account Info */}
                    <div className="px-3 py-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <User className="h-3 w-3 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">Connected Wallet</div>
                          <div className="text-xs text-gray-500 font-mono">{formatAddress(account!)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate('/dashboard');
                          setIsProfileOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-medium"
                      >
                        <User className="h-3 w-3" />
                        Go to Dashboard
                      </button>
                      <button
                        onClick={copyAddress}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Copy className="h-3 w-3" />
                        Copy Address
                      </button>
                      <button
                        onClick={openExplorer}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View on Explorer
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <Settings className="h-3 w-3" />
                        Settings
                      </button>
                    </div>

                    {/* Disconnect */}
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={() => {
                          disconnect();
                          setIsProfileOpen(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="h-3 w-3" />
                        Disconnect Wallet
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <LiquidButton 
              size="sm" 
              className="px-5 py-2 text-sm text-blue-600"
              onClick={connect}
              disabled={isLoading}
            >
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </LiquidButton>
          )}
        </motion.div>

        {/* Mobile Menu Button */}
        <motion.button className="md:hidden flex items-center" onClick={toggleMenu} whileTap={{ scale: 0.9 }}>
          <Menu className="h-6 w-6 text-gray-900" />
        </motion.button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-white z-50 pt-24 px-6 md:hidden"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <motion.button
              className="absolute top-6 right-6 p-2"
              onClick={toggleMenu}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <X className="h-6 w-6 text-gray-900" />
            </motion.button>
            <div className="flex flex-col space-y-6">
              {["Home", "Features", "Testimonials", "About"].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 + 0.1 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <button 
                    onClick={() => {
                      if (item === 'Home') {
                        navigate('/');
                      } else if (item === 'Features' || item === 'Testimonials' || item === 'About') {
                        // Scroll to section on landing page
                        navigate('/');
                        setTimeout(() => {
                          const element = typeof window !== 'undefined' ? document.getElementById(item.toLowerCase()) : null;
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }
                      toggleMenu();
                    }}
                    className="text-base text-gray-900 font-medium"
                  >
                    {item}
                  </button>
                </motion.div>
              ))}
              {isConnected && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <button 
                    onClick={() => {
                      navigate('/dashboard');
                      toggleMenu();
                    }}
                    className={`text-base font-medium ${
                      location.pathname === '/dashboard' 
                        ? 'text-blue-600' 
                        : 'text-gray-900'
                    }`}
                  >
                    Dashboard
                  </button>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                exit={{ opacity: 0, y: 20 }}
                className="pt-6"
              >
                {isConnected ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 rounded-lg border border-gray-200">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700">
                        {formatAddress(account!)}
                      </span>
                    </div>
                    <LiquidButton 
                      size="lg" 
                      className="w-full px-5 py-3 text-base"
                      onClick={() => {
                        disconnect();
                        toggleMenu();
                      }}
                    >
                      Disconnect
                    </LiquidButton>
                  </div>
                ) : (
                  <LiquidButton 
                    size="lg" 
                    className="w-full px-5 py-3 text-base text-blue-600"
                    onClick={() => {
                      connect();
                      toggleMenu();
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? "Connecting..." : "Connect Wallet"}
                  </LiquidButton>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


export { Navbar1 }
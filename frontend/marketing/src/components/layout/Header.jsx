import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            
            <span className="ml-2 text-xl font-bold text-orange-600">
              Customate.ai
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/features"
              className="text-sm font-medium transition-colors text-gray-700 hover:text-orange-600"
            >
              Features
            </Link>
            <Link
              to="/pricing"
              className="text-sm font-medium transition-colors text-gray-700 hover:text-orange-600"
            >
              Pricing
            </Link>
            <Link
              to="/blog"
              className="text-sm font-medium transition-colors text-gray-700 hover:text-orange-600"
            >
              Blog
            </Link>
            <Link
              to="/contact"
              className="text-sm font-medium transition-colors text-gray-700 hover:text-orange-600"
            >
              Contact
            </Link>
            <div className="flex space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                as={Link} 
                to="/login"
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                Log In
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                as={Link} 
                to="/register"
                className="bg-orange-600 hover:bg-orange-700"
              >
                Sign Up
              </Button>
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-orange-600 focus:outline-none"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <div
        className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 bg-white shadow-lg">
          <Link
            to="/features"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600"
            onClick={() => setIsMenuOpen(false)}
          >
            Features
          </Link>
          <Link
            to="/pricing"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600"
            onClick={() => setIsMenuOpen(false)}
          >
            Pricing
          </Link>
          <Link
            to="/blog"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600"
            onClick={() => setIsMenuOpen(false)}
          >
            Blog
          </Link>
          <Link
            to="/contact"
            className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600"
            onClick={() => setIsMenuOpen(false)}
          >
            Contact
          </Link>
          <div className="mt-4 flex flex-col space-y-2 px-3">
            <Button 
              variant="outline" 
              size="sm" 
              fullWidth 
              as={Link} 
              to="/login"
              className="text-orange-600 border-orange-600 hover:bg-orange-50"
            >
              Log In
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              fullWidth 
              as={Link} 
              to="/signup"
              className="bg-orange-600 hover:bg-orange-700"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
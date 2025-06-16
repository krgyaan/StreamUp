import { useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { FileSpreadsheet, MenuIcon, XIcon } from "lucide-react"
import { Button } from '@/components/ui/button'

export function Header() {
    const navigate = useNavigate()
    const location = useLocation()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const isActive = (path: string) => location.pathname === path

    return (
        <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
            <div className="container mx-auto flex items-center justify-between p-4">
                {/* Logo */}
                <Button
                    onClick={() => navigate('/')}
                    variant="link"
                    className="flex items-center space-x-2 cursor-pointer"
                >
                    <FileSpreadsheet className="h-10 w-10 text-primary" />
                    <span className="text-lg font-semibold">StreamUp</span>
                </Button>

                {/* Desktop Nav */}
                <div className="hidden md:flex space-x-4">
                    <Button
                        variant='link'
                        onClick={() => navigate('/')}
                        className={`${isActive('/') ? 'cursor-pointer underline' : 'cursor-pointer'}`}
                    >
                        Home
                    </Button>
                    <Button
                        variant='link'
                        onClick={() => navigate('/upload')}
                        className={`${isActive('/upload') ? 'cursor-pointer underline' : 'cursor-pointer'}`}
                    >
                        Upload
                    </Button>
                    <Button
                        variant='link'
                        onClick={() => navigate('/report')}
                        className={`${isActive('/report') ? 'cursor-pointer underline' : 'cursor-pointer'}`}
                    >
                        Report
                    </Button>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden cursor-pointer"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen
                        ? <XIcon className="h-6 w-6" />
                        : <MenuIcon className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Nav */}
            {mobileMenuOpen && (
                <div className="md:hidden px-4 pb-4 space-y-2 bg-zinc-900">
                    <Button
                        variant="link"
                        className={`${isActive('/') ? 'underline' : ''} w-full justify-start cursor-pointer`}
                        onClick={() => {
                            navigate('/')
                            setMobileMenuOpen(false)
                        }}
                    >
                        Home
                    </Button>
                    <Button
                        variant="link"
                        className={`${isActive('/upload') ? 'underline' : ''} w-full justify-start cursor-pointer`}
                        onClick={() => {
                            navigate('/upload')
                            setMobileMenuOpen(false)
                        }}
                    >
                        Upload
                    </Button>
                    <Button
                        variant="link"
                        className={`${isActive('/report') ? 'underline' : ''} w-full justify-start cursor-pointer`}
                        onClick={() => {
                            navigate('/report')
                            setMobileMenuOpen(false)
                        }}
                    >
                        Report
                    </Button>
                </div>
            )}
        </header>
    )
}

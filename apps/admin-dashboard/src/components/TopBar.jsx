import React, { useState } from 'react';
import { Search, Bell, Sun, Moon, Menu, Building2, ChevronDown, LogOut } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { Button } from './ui/Button';
import { useBranch } from '../contexts/BranchContext';


export function TopBar({ onToggleSidebar }) {
    const { theme, setTheme } = useTheme();
    const { branches, selectedBranch, selectBranch } = useBranch();
    const [branchOpen, setBranchOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('jjikgo-admin-store');
        window.location.reload();
    };

    const handleBranchSelect = (branchId) => {
        selectBranch(branchId);
        setBranchOpen(false);
    };

    return (
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
            <div className="flex items-center gap-4 flex-1">
                <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="lg:hidden text-muted-foreground">
                    <Menu className="h-5 w-5" />
                </Button>
                <div className="hidden md:flex items-center w-full max-w-md relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search everywhere..."
                        className="h-10 w-full rounded-md border border-input bg-muted/40 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20"
                        id="global-search"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-3">
                {/* Branch Selector */}
                <div className="relative">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 flex items-center gap-2 text-sm font-medium"
                        onClick={() => setBranchOpen(!branchOpen)}
                    >
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="hidden sm:inline max-w-[120px] truncate">
                            {selectedBranch ? selectedBranch.name : 'All Branches'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>

                    {branchOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setBranchOpen(false)} />
                            <div className="absolute right-0 mt-1 w-52 bg-card border rounded-lg shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                                <button
                                    onClick={() => handleBranchSelect('ALL')}
                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 ${selectedBranch?.id === 'ALL' ? 'text-primary font-semibold' : ''}`}
                                >
                                    <span className="h-2 w-2 rounded-full bg-primary" />
                                    All Branches
                                </button>
                                {branches.map(branch => (
                                    <button
                                        key={branch.id}
                                        onClick={() => handleBranchSelect(branch.id)}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 ${selectedBranch?.id === branch.id ? 'text-primary font-semibold' : ''}`}
                                    >
                                        <span className={`h-2 w-2 rounded-full ${branch.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        {branch.name}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-card" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="text-muted-foreground hover:text-foreground"
                >
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    title="Logout"
                    className="text-muted-foreground hover:text-destructive"
                >
                    <LogOut className="h-4 w-4" />
                </Button>

                <div className="h-8 w-8 rounded-full bg-primary/20 flex shrink-0 items-center justify-center text-primary font-bold ml-1">
                    A
                </div>
            </div>
        </header>
    );
}

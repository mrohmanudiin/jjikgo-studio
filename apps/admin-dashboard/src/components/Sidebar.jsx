import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Building2,
    Users,
    History,
    CircleDollarSign,
    Palette,
    Settings,
    FileText,
    Wallet,
    X,
    Package,
    Tag,
    ListOrdered,
    Coffee,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';

export function Sidebar({ onClose }) {
    const sections = [
        {
            title: 'Overview',
            items: [
                { name: 'Dashboard', path: '/', icon: LayoutDashboard },
                { name: 'Branches', path: '/branches', icon: Building2 },
                { name: 'Transactions', path: '/transactions', icon: History },
                { name: 'Queue Monitor', path: '/queue', icon: ListOrdered },
            ]
        },
        {
            title: 'Finance',
            items: [
                { name: 'Finance', path: '/finance', icon: CircleDollarSign },
                { name: 'Daily Cash', path: '/daily-cash', icon: Wallet },
                { name: 'Reports', path: '/reports', icon: FileText },
            ]
        },
        {
            title: 'Manage',
            items: [
                { name: 'Themes', path: '/themes', icon: Palette },
                { name: 'Packages', path: '/packages', icon: Package },
                { name: 'Cafe & Snacks', path: '/cafe-snacks', icon: Coffee },
                { name: 'Promos', path: '/promos', icon: Tag },
                { name: 'Users', path: '/users', icon: Users },
            ]
        },
        {
            title: 'System',
            items: [
                { name: 'Settings', path: '/settings', icon: Settings },
            ]
        },
    ];

    return (
        <aside className="w-64 border-r bg-card flex flex-col h-full shadow-sm">
            <div className="h-16 flex items-center justify-between px-6 border-b">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
                    <h1 className="text-xl font-bold tracking-tight">Photobooth<span className="text-primary">Admin</span></h1>
                </div>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden text-muted-foreground mr-[-8px]">
                        <X className="h-5 w-5" />
                    </Button>
                )}
            </div>
            <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
                {sections.map((section) => (
                    <div key={section.title}>
                        <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
                            {section.title}
                        </div>
                        <div className="space-y-0.5">
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.name}
                                    to={item.path}
                                    onClick={onClose}
                                    className={({ isActive }) => cn(
                                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <item.icon className={cn("h-[18px] w-[18px]", "group-hover:text-foreground")} />
                                    {item.name}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>
            <div className="p-4 border-t">
                <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            A
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground leading-tight">Admin User</span>
                            <span className="text-xs text-muted-foreground">admin@jjikgo.com</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

"use client"

import React from 'react';
import { Bike } from 'lucide-react';

interface LoadingScreenProps {
    message?: string;
    submessage?: string;
    /** Show a minimal inline spinner instead of full-screen */
    inline?: boolean;
}

export function LoadingScreen({ message = 'Cargando...', submessage, inline = false }: LoadingScreenProps) {
    if (inline) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                    <div className="loading-spinner" />
                    <span className="text-sm text-muted-foreground animate-fade-in">{message}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="flex flex-col items-center gap-6 animate-fade-in">
                {/* Animated logo container */}
                <div className="relative">
                    {/* Outer pulse ring */}
                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping-slow" />
                    {/* Inner glow */}
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center animate-pulse-soft">
                        <Bike className="h-10 w-10 text-primary animate-bounce-gentle" />
                    </div>
                </div>

                {/* Text content */}
                <div className="flex flex-col items-center gap-2">
                    <span className="text-base font-medium text-foreground tracking-wide">
                        {message}
                    </span>
                    {submessage && (
                        <span className="text-sm text-muted-foreground animate-fade-in-delayed">
                            {submessage}
                        </span>
                    )}
                </div>

                {/* Animated dots / progress bar */}
                <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-loading-dot" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-loading-dot" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-loading-dot" style={{ animationDelay: '300ms' }} />
                </div>
            </div>
        </div>
    );
}

"use client"

import React, { useState } from 'react';
import { IssueBikeView } from '@/views/IssueBikeView';
import { MotorcycleList } from '@/components/MotorcycleList';
import { Button } from "@/components/ui/button"

export default function Dashboard() {
    const [view, setView] = useState<'list' | 'issue'>('list');

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b">
                <div className="container mx-auto py-4 px-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold">InversionesMD</h1>
                    <nav className="flex gap-4">
                        <Button 
                            variant={view === 'list' ? "default" : "ghost"} 
                            onClick={() => setView('list')}
                        >
                            Dashboard
                        </Button>
                        <Button 
                            variant={view === 'issue' ? "default" : "ghost"}
                            onClick={() => setView('issue')}
                        >
                            + Nueva Entrega
                        </Button>
                    </nav>
                </div>
            </header>

            <main className="container mx-auto py-8 px-4">
                {view === 'list' ? <MotorcycleList /> : <IssueBikeView />}
            </main>
        </div>
    );
}

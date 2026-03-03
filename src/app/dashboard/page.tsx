"use client"

import React from 'react';
import { MotorcycleList } from '@/components/MotorcycleList';
import { MainLayout } from '@/components/MainLayout';

export default function DashboardPage() {
    return (
        <MainLayout>
            <MotorcycleList />
        </MainLayout>
    );
}
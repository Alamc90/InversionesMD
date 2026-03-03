"use client"

import React from 'react';
import { MainLayout } from '@/components/MainLayout';
import { FinancialDashboardView } from '@/views/FinancialDashboardView';

export default function BalancePage() {
    return (
        <MainLayout>
            <FinancialDashboardView />
        </MainLayout>
    );
}

import React from 'react';
import MotorcycleList from '../components/MotorcycleList';

const Dashboard: React.FC = () => {
    return (
        <div className="dashboard">
            <h1>Motorcycle Issuance Dashboard</h1>
            <MotorcycleList />
        </div>
    );
};

export default Dashboard;
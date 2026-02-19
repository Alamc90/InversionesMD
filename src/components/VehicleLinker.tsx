import React, { useState } from 'react';

const VehicleLinker: React.FC = () => {
    const [customerId, setCustomerId] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehicles, setVehicles] = useState<string[]>([]);

    const handleLinkVehicle = () => {
        if (customerId && vehicleModel) {
            setVehicles([...vehicles, `${vehicleModel} linked to Customer ID: ${customerId}`]);
            setVehicleModel('');
        }
    };

    return (
        <div>
            <h2>Link Vehicle to Customer</h2>
            <input
                type="text"
                placeholder="Customer ID"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
            />
            <input
                type="text"
                placeholder="Vehicle Model"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
            />
            <button onClick={handleLinkVehicle}>Link Vehicle</button>
            <h3>Linked Vehicles:</h3>
            <ul>
                {vehicles.map((vehicle, index) => (
                    <li key={index}>{vehicle}</li>
                ))}
            </ul>
        </div>
    );
};

export default VehicleLinker;
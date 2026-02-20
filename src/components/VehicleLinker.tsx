import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

const VehicleLinker: React.FC = () => {
    const [customerId, setCustomerId] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehicles, setVehicles] = useState<string[]>([]);

    const handleLinkVehicle = () => {
        if (customerId && vehicleModel) {
            setVehicles([...vehicles, `${vehicleModel} linked to Customer ID: ${customerId}`]);
            setVehicleModel('');
            setCustomerId('');
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto mt-8">
            <CardHeader>
                <CardTitle>Link Vehicle to Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="customerId">Customer ID</Label>
                    <Input
                        id="customerId"
                        type="text"
                        placeholder="Enter Customer ID"
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="vehicleModel">Vehicle Model</Label>
                    <Input
                        id="vehicleModel"
                        type="text"
                        placeholder="Enter Vehicle Model"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                    />
                </div>

                <div className="pt-4">
                    <h3 className="font-medium mb-2">Linked Vehicles:</h3>
                    <ul className="list-disc pl-5 space-y-1">
                        {vehicles.map((vehicle, index) => (
                            <li key={index} className="text-sm">{vehicle}</li>
                        ))}
                    </ul>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleLinkVehicle} className="w-full">Link Vehicle</Button>
            </CardFooter>
        </Card>
    );
};

export default VehicleLinker;
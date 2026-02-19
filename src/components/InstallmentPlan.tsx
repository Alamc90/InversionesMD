import React, { useState } from 'react';

const InstallmentPlan = () => {
    const [totalAmount, setTotalAmount] = useState(0);
    const [installments, setInstallments] = useState(1);
    const [installmentValue, setInstallmentValue] = useState(0);

    const calculateInstallment = () => {
        if (installments > 0) {
            setInstallmentValue(totalAmount / installments);
        }
    };

    const handleTotalAmountChange = (e) => {
        setTotalAmount(Number(e.target.value));
    };

    const handleInstallmentsChange = (e) => {
        setInstallments(Number(e.target.value));
    };

    return (
        <div className="installment-plan">
            <h2>Installment Plan</h2>
            <div>
                <label>Total Amount:</label>
                <input
                    type="number"
                    value={totalAmount}
                    onChange={handleTotalAmountChange}
                />
            </div>
            <div>
                <label>Number of Installments:</label>
                <input
                    type="number"
                    value={installments}
                    onChange={handleInstallmentsChange}
                />
            </div>
            <button onClick={calculateInstallment}>Calculate Installment</button>
            <div>
                <h3>Installment Value: {installmentValue.toFixed(2)}</h3>
            </div>
        </div>
    );
};

export default InstallmentPlan;
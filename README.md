# Vehicle Installment Manager

## Overview
The Vehicle Installment Manager is a web application designed to manage the issuance of motorcycles, capture personal data from customers, link them to vehicles, and manage payment installments. The application provides a user-friendly interface for both customers and administrators to track payment statuses and manage vehicle information.

## Features
- Capture personal data of customers through a form.
- Link customers to motorcycles with vehicle details.
- Manage payment installments, including calculation of installment values.
- Display a list of issued motorcycles along with customer details and payment statuses.

## Project Structure
```
vehicle-installment-manager
├── src
│   ├── components
│   │   ├── CustomerForm.tsx
│   │   ├── VehicleLinker.tsx
│   │   ├── InstallmentPlan.tsx
│   │   └── MotorcycleList.tsx
│   ├── models
│   │   ├── Customer.ts
│   │   ├── Vehicle.ts
│   │   └── Payment.ts
│   ├── services
│   │   ├── DataService.ts
│   │   └── PaymentCalculator.ts
│   ├── styles
│   │   ├── main.css
│   │   └── theme.css
│   ├── views
│   │   ├── Dashboard.tsx
│   │   └── IssueBikeView.tsx
│   ├── App.tsx
│   └── index.tsx
├── public
│   └── index.html
├── package.json
├── tsconfig.json
└── README.md
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd vehicle-installment-manager
   ```
3. Install the dependencies:
   ```
   npm install
   npm install @supabase/supabase-js.
   ```

## Usage
1. Start the development server:
   ```
   npm start
   ```
2. Open your browser and navigate to `http://localhost:3000` to access the application.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
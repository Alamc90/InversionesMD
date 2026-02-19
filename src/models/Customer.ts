export interface Customer {
    id?: number;
    first_name: string; // Nombre
    last_name: string;  // Apellido
    cedula: string;     // Numero de Cedula
    address: string;    // Dirección
    phone: string;      // Contacto
    
    // Fiador
    guarantor_first_name: string;
    guarantor_last_name: string;
    guarantor_cedula: string;
    guarantor_address: string;
}

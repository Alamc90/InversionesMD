/**
 * Thermal Printer Service
 * Supports direct printing via:
 * - Web Serial API (USB thermal printers)
 * - Web Bluetooth API (Bluetooth thermal printers)
 * 
 * Uses ESC/POS commands compatible with most 58mm thermal printers.
 */

// ─── ESC/POS Command Constants ─────────────────────────────────────────
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

const CMD = {
  INIT:           [ESC, 0x40],                   // Initialize printer
  ALIGN_LEFT:     [ESC, 0x61, 0x00],
  ALIGN_CENTER:   [ESC, 0x61, 0x01],
  ALIGN_RIGHT:    [ESC, 0x61, 0x02],
  BOLD_ON:        [ESC, 0x45, 0x01],
  BOLD_OFF:       [ESC, 0x45, 0x00],
  FONT_NORMAL:    [ESC, 0x21, 0x00],             // Normal size
  FONT_DOUBLE_H:  [ESC, 0x21, 0x10],             // Double height
  FONT_SMALL:     [ESC, 0x21, 0x01],             // Font B (smaller)
  CUT_PAPER:      [GS, 0x56, 0x00],              // Full cut
  PARTIAL_CUT:    [GS, 0x56, 0x01],              // Partial cut
  FEED_LINES:     (n: number) => [ESC, 0x64, n], // Feed n lines
};

// 58mm paper = ~32 chars in Font A, ~42 chars in Font B
const LINE_WIDTH = 32;

// ─── Text Encoding Helper ───────────────────────────────────────────────
function textToBytes(text: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
}

function line(text: string): number[] {
  return [...textToBytes(text), LF];
}

function dashedLine(): number[] {
  return line('-'.repeat(LINE_WIDTH));
}

function centeredLine(text: string): number[] {
  const trimmed = text.substring(0, LINE_WIDTH);
  const padding = Math.max(0, Math.floor((LINE_WIDTH - trimmed.length) / 2));
  return line(' '.repeat(padding) + trimmed);
}

function leftRightLine(left: string, right: string): number[] {
  const maxLeft = LINE_WIDTH - right.length - 1;
  const trimmedLeft = left.substring(0, maxLeft);
  const spaces = Math.max(1, LINE_WIDTH - trimmedLeft.length - right.length);
  return line(trimmedLeft + ' '.repeat(spaces) + right);
}

function wrapText(text: string, width: number = LINE_WIDTH): string[] {
  const lines: string[] = [];
  while (text.length > 0) {
    if (text.length <= width) {
      lines.push(text);
      break;
    }
    let breakAt = text.lastIndexOf(' ', width);
    if (breakAt <= 0) breakAt = width;
    lines.push(text.substring(0, breakAt));
    text = text.substring(breakAt).trimStart();
  }
  return lines;
}

// ─── Receipt Data Builder ───────────────────────────────────────────────
export interface ReceiptData {
  businessName: string;
  nit: string;
  address: string;
  phone: string;
  date: string;
  time: string;
  receiptNumber: string | number;
  customerName: string;
  cedula: string;
  plate: string;
  installmentsCount: string;
  installmentValue: string;
  totalPayment: string;
  statusText: string;
}

export function buildESCPOSReceipt(data: ReceiptData): Uint8Array {
  const bytes: number[] = [];

  const push = (...cmds: number[][]) => {
    for (const cmd of cmds) bytes.push(...cmd);
  };

  // Initialize
  push(CMD.INIT);

  // Header - centered
  push(CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.FONT_DOUBLE_H);
  push(line(data.businessName.substring(0, LINE_WIDTH)));
  push(CMD.FONT_NORMAL, CMD.BOLD_OFF);
  push(centeredLine(`NIT: ${data.nit}`));

  // Address may be long, wrap it
  const addrLines = wrapText(data.address, LINE_WIDTH);
  for (const l of addrLines) {
    push(centeredLine(l));
  }
  if (data.phone) {
    push(centeredLine(data.phone));
  }

  push(CMD.ALIGN_LEFT);
  push(dashedLine());

  // Date & Receipt #
  push(line(`Fecha: ${data.date} ${data.time}`));
  push(line(`Recibo #: ${data.receiptNumber}`));

  push(dashedLine());

  // Customer info
  push(CMD.BOLD_ON);
  push(line('Cliente:'));
  push(CMD.BOLD_OFF);
  const nameLines = wrapText(data.customerName, LINE_WIDTH);
  for (const l of nameLines) {
    push(line(l));
  }

  push(leftRightLine('CC:', data.cedula));
  push(leftRightLine('Placa:', data.plate));

  push(dashedLine());

  // Payment details
  push(leftRightLine('Cant. Cuotas:', data.installmentsCount));
  push(leftRightLine('Valor Cuota:', data.installmentValue));

  push(dashedLine());

  // Total - big and bold
  push(CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.FONT_DOUBLE_H);
  push(line(`Total: $${data.totalPayment}`));
  push(CMD.FONT_NORMAL, CMD.BOLD_OFF, CMD.ALIGN_LEFT);

  push(dashedLine());

  // Status
  push(CMD.BOLD_ON);
  push(line(`Estado:`));
  push(CMD.BOLD_OFF);
  const statusLines = wrapText(data.statusText, LINE_WIDTH);
  for (const l of statusLines) {
    push(line(l));
  }

  // Footer
  push([LF]);
  push(CMD.ALIGN_CENTER);
  push(line('Gracias por su preferencia'));
  push(line(data.businessName.substring(0, LINE_WIDTH)));
  push(CMD.ALIGN_LEFT);

  // Feed & cut
  push(CMD.FEED_LINES(4));
  push(CMD.PARTIAL_CUT);

  return new Uint8Array(bytes);
}

// ─── Printer Connection Types ───────────────────────────────────────────

type PrinterType = 'serial' | 'bluetooth' | 'none';

interface PrinterConnection {
  type: PrinterType;
  device: any;
  writer?: WritableStreamDefaultWriter;
  characteristic?: any; // BluetoothRemoteGATTCharacteristic (Web Bluetooth API)
  name?: string;
}

let currentConnection: PrinterConnection | null = null;

// ─── Printer Persistence (localStorage) ────────────────────────────────

const PRINTER_STORAGE_KEY = 'vehicle-manager-printer';

interface SavedPrinter {
  type: 'serial' | 'bluetooth';
  name: string;
  /** For Bluetooth, store device ID to try reconnecting */
  bluetoothDeviceId?: string;
}

function savePrinterPreference(type: 'serial' | 'bluetooth', name: string, bluetoothDeviceId?: string) {
  try {
    const data: SavedPrinter = { type, name, bluetoothDeviceId };
    localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[Printer] No se pudo guardar preferencia:', e);
  }
}

function loadPrinterPreference(): SavedPrinter | null {
  try {
    const raw = localStorage.getItem(PRINTER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedPrinter;
  } catch {
    return null;
  }
}

function clearPrinterPreference() {
  try {
    localStorage.removeItem(PRINTER_STORAGE_KEY);
  } catch {}
}

export function getSavedPrinterInfo(): SavedPrinter | null {
  return loadPrinterPreference();
}

// ─── Auto-Reconnect ────────────────────────────────────────────────────

let autoReconnecting = false;

export function isAutoReconnecting(): boolean {
  return autoReconnecting;
}

/**
 * Tries to reconnect to a previously saved printer without user interaction.
 * - USB: uses navigator.serial.getPorts() (no permission prompt needed)
 * - Bluetooth: uses navigator.bluetooth.getDevices() if available
 * Returns true if reconnection succeeded.
 */
export async function autoReconnectPrinter(): Promise<boolean> {
  if (currentConnection) return true; // Already connected

  const saved = loadPrinterPreference();
  if (!saved) return false;

  autoReconnecting = true;
  console.log(`[Printer] Intentando reconectar a ${saved.type}: ${saved.name}`);

  try {
    if (saved.type === 'serial') {
      return await autoReconnectUSB();
    } else if (saved.type === 'bluetooth') {
      return await autoReconnectBluetooth(saved);
    }
  } catch (e) {
    console.warn('[Printer] Error en auto-reconexión:', e);
  } finally {
    autoReconnecting = false;
  }

  return false;
}

async function autoReconnectUSB(): Promise<boolean> {
  if (!('serial' in navigator)) return false;

  try {
    const ports = await (navigator as any).serial.getPorts();
    if (ports.length === 0) {
      console.log('[Printer] No hay puertos USB autorizados previamente');
      return false;
    }

    // Use the first previously-authorized port
    const port = ports[0];
    await port.open({ baudRate: 9600 });

    const writer = port.writable.getWriter();
    currentConnection = {
      type: 'serial',
      device: port,
      writer,
      name: 'Impresora USB',
    };

    console.log('[Printer] Reconexión USB exitosa');
    return true;
  } catch (e: any) {
    // Port might already be open or device not available
    console.warn('[Printer] No se pudo reconectar USB:', e.message);
    return false;
  }
}

async function autoReconnectBluetooth(saved: SavedPrinter): Promise<boolean> {
  if (!('bluetooth' in navigator)) return false;

  // getDevices() is needed for auto-reconnect without user prompt
  const bt = navigator as any;
  if (!bt.bluetooth?.getDevices) {
    console.log('[Printer] navigator.bluetooth.getDevices() no disponible');
    return false;
  }

  try {
    const devices = await bt.bluetooth.getDevices();
    if (!devices || devices.length === 0) return false;

    // Find the device we saved, or use the first one
    let device = saved.bluetoothDeviceId
      ? devices.find((d: any) => d.id === saved.bluetoothDeviceId)
      : devices[0];

    if (!device) device = devices[0];
    if (!device?.gatt) return false;

    // We need to request watchAdvertisements and wait, or try direct connect
    const server = await device.gatt.connect();

    // Pequeño delay para que el stack de Bluetooth de Windows se estabilice tras reconectar
    await new Promise(resolve => setTimeout(resolve, 500));

    let characteristic: any = null;
    let retries = 3;

    while (retries > 0 && !characteristic) {
      try {
        for (const serviceUUID of BT_SERVICES) {
          try {
            const service = await server.getPrimaryService(serviceUUID);
            const chars = await service.getCharacteristics();
            for (const char of chars) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                characteristic = char;
                break;
              }
            }
            if (characteristic) break;
          } catch { continue; }
        }
      } catch (e) {
        console.warn('[Printer] Error buscando servicios (reintento)', e);
      }

      if (!characteristic) {
        retries--;
        if (retries > 0) {
          console.log(`[Printer] Reintentando buscar características... (${retries} intentos restantes)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!characteristic) return false;

    currentConnection = {
      type: 'bluetooth',
      device,
      characteristic,
      name: device.name || saved.name || 'Impresora Bluetooth',
    };

    console.log('[Printer] Reconexión Bluetooth exitosa');
    return true;
  } catch (e: any) {
    console.warn('[Printer] No se pudo reconectar Bluetooth:', e.message);
    return false;
  }
}

// ─── Web Serial API (USB Printers) ─────────────────────────────────────

export async function connectUSBPrinter(): Promise<PrinterConnection> {
  if (!('serial' in navigator)) {
    throw new Error('Tu navegador no soporta Web Serial API. Usa Chrome o Edge.');
  }

  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });

    const writer = port.writable.getWriter();
    
    currentConnection = {
      type: 'serial',
      device: port,
      writer,
      name: 'Impresora USB',
    };

    savePrinterPreference('serial', 'Impresora USB');
    return currentConnection;
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      throw new Error('No se seleccionó ninguna impresora.');
    }
    throw new Error(`Error al conectar: ${error.message}`);
  }
}

// ─── Web Bluetooth API (Bluetooth Printers) ─────────────────────────────

// Common Bluetooth printer service/characteristic UUIDs
const BT_PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb';
const BT_PRINTER_CHAR    = '00002af1-0000-1000-8000-00805f9b34fb';

// Alternative UUIDs used by some printers
const BT_SERVICES = [
  BT_PRINTER_SERVICE,
  '0000ff00-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

export async function connectBluetoothPrinter(): Promise<PrinterConnection> {
  if (!('bluetooth' in navigator)) {
    throw new Error('Tu navegador no soporta Web Bluetooth API. Usa Chrome o Edge.');
  }

  try {
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        { services: [BT_PRINTER_SERVICE] },
        { services: ['0000ff00-0000-1000-8000-00805f9b34fb'] },
      ],
      optionalServices: BT_SERVICES,
    });

    const server = await device.gatt.connect();
    
    // Pequeño delay para que el stack de Bluetooth de Windows se estabilice
    await new Promise(resolve => setTimeout(resolve, 500));

    let characteristic: any = null;
    let retries = 3;
    
    while (retries > 0 && !characteristic) {
      try {
        for (const serviceUUID of BT_SERVICES) {
          try {
            const service = await server.getPrimaryService(serviceUUID);
            const chars = await service.getCharacteristics();
            // Find writable characteristic
            for (const char of chars) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                characteristic = char;
                break;
              }
            }
            if (characteristic) break;
          } catch {
            continue;
          }
        }
      } catch (e) {
        console.warn('[Printer] Error buscando servicios manual (reintento)', e);
      }

      if (!characteristic) {
        retries--;
        if (retries > 0) {
          console.log(`[Printer] Reintentando buscar características... (${retries} intentos restantes)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    if (!characteristic) {
      throw new Error('No se encontró una característica de escritura en la impresora.');
    }

    currentConnection = {
      type: 'bluetooth',
      device,
      characteristic,
      name: device.name || 'Impresora Bluetooth',
    };

    savePrinterPreference('bluetooth', currentConnection.name!, device.id);
    return currentConnection;
  } catch (error: any) {
    if (error.name === 'NotFoundError') {
      throw new Error('No se seleccionó ninguna impresora Bluetooth.');
    }
    throw new Error(`Error al conectar Bluetooth: ${error.message}`);
  }
}

// ─── Send Data ──────────────────────────────────────────────────────────

async function sendToSerial(data: Uint8Array, writer: WritableStreamDefaultWriter) {
  await writer.write(data);
}

async function sendToBluetooth(data: Uint8Array, characteristic: any) {
  // BLE has a max packet size (~20-512 bytes depending on device)
  // Send in chunks of 100 bytes to be safe
  const CHUNK_SIZE = 100;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    await characteristic.writeValueWithoutResponse(chunk);
    // Small delay between chunks for printer to process
    await new Promise(resolve => setTimeout(resolve, 30));
  }
}

export async function printDirect(data: Uint8Array): Promise<void> {
  if (!currentConnection) {
    throw new Error('No hay impresora conectada. Conecta una primero.');
  }

  if (currentConnection.type === 'serial' && currentConnection.writer) {
    await sendToSerial(data, currentConnection.writer);
  } else if (currentConnection.type === 'bluetooth' && currentConnection.characteristic) {
    await sendToBluetooth(data, currentConnection.characteristic);
  } else {
    throw new Error('Conexión de impresora inválida.');
  }
}

// ─── Disconnect ─────────────────────────────────────────────────────────

export async function disconnectPrinter(): Promise<void> {
  if (!currentConnection) return;

  try {
    if (currentConnection.type === 'serial') {
      if (currentConnection.writer) {
        currentConnection.writer.releaseLock();
      }
      await currentConnection.device.close();
    } else if (currentConnection.type === 'bluetooth') {
      if (currentConnection.device?.gatt?.connected) {
        currentConnection.device.gatt.disconnect();
      }
    }
  } catch (e) {
    console.warn('Error al desconectar impresora:', e);
  }

  currentConnection = null;
  clearPrinterPreference();
}

// ─── Status ─────────────────────────────────────────────────────────────

export function getPrinterStatus(): { connected: boolean; type: PrinterType; name: string } {
  if (!currentConnection) {
    return { connected: false, type: 'none', name: '' };
  }
  return {
    connected: true,
    type: currentConnection.type,
    name: currentConnection.name || 'Impresora',
  };
}

export function isPrinterConnected(): boolean {
  return currentConnection !== null;
}

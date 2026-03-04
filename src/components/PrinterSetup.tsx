"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Printer, Bluetooth, Usb, Unplug, CheckCircle2 } from "lucide-react";
import {
  connectUSBPrinter,
  connectBluetoothPrinter,
  disconnectPrinter,
  getPrinterStatus,
  buildESCPOSReceipt,
  printDirect,
  autoReconnectPrinter,
  getSavedPrinterInfo,
  isAutoReconnecting,
} from "@/lib/thermalPrinter";

export const PrinterSetup = () => {
  const [status, setStatus] = useState(getPrinterStatus());
  const [connecting, setConnecting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // Auto-reconnect on mount
  useEffect(() => {
    const saved = getSavedPrinterInfo();
    if (saved && !getPrinterStatus().connected) {
      setReconnecting(true);
      autoReconnectPrinter()
        .then((ok) => {
          if (ok) {
            setStatus(getPrinterStatus());
            toast.success(`Impresora ${saved.type === 'serial' ? 'USB' : 'Bluetooth'} reconectada automáticamente`);
          }
        })
        .catch(() => {})
        .finally(() => setReconnecting(false));
    }
  }, []);

  // Poll status every 2s in case connection drops
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getPrinterStatus());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectUSB = async () => {
    setConnecting(true);
    try {
      await connectUSBPrinter();
      setStatus(getPrinterStatus());
      toast.success("Impresora USB conectada correctamente");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectBluetooth = async () => {
    setConnecting(true);
    try {
      await connectBluetoothPrinter();
      setStatus(getPrinterStatus());
      toast.success("Impresora Bluetooth conectada correctamente");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectPrinter();
    setStatus(getPrinterStatus());
    toast.success("Impresora desconectada");
  };

  const handleTestPrint = async () => {
    try {
      const testData = buildESCPOSReceipt({
        businessName: "PRUEBA DE IMPRESION",
        nit: "0000000000",
        address: "Direccion de prueba",
        phone: "000-000-0000",
        date: new Date().toLocaleDateString("es-CO"),
        time: new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        receiptNumber: "TEST",
        customerName: "Cliente de Prueba",
        cedula: "0000000",
        plate: "AAA-000",
        installmentsCount: "1",
        installmentValue: "100,000",
        totalPayment: "100,000",
        statusText: "Al dia",
      });
      await printDirect(testData);
      toast.success("Prueba de impresión enviada");
    } catch (error: any) {
      toast.error("Error en prueba: " + error.message);
    }
  };

  const isSerialSupported = typeof window !== "undefined" && "serial" in navigator;
  const isBluetoothSupported = typeof window !== "undefined" && "bluetooth" in navigator;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Impresora Térmica
        </CardTitle>
        <CardDescription>
          Conecta una impresora térmica de 58mm por USB o Bluetooth para
          imprimir recibos directamente sin abrir ventanas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border ${
            status.connected
              ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
              : reconnecting
              ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
              : "bg-muted/50"
          }`}
        >
          <div
            className={`h-3 w-3 rounded-full ${
              status.connected
                ? "bg-green-500 animate-pulse"
                : reconnecting
                ? "bg-blue-500 animate-pulse"
                : "bg-gray-300"
            }`}
          />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {status.connected
                ? `Conectada: ${status.name}`
                : reconnecting
                ? "Reconectando impresora..."
                : getSavedPrinterInfo()
                ? `Guardada: ${getSavedPrinterInfo()!.name} (desconectada)`
                : "Sin impresora conectada"}
            </p>
            <p className="text-xs text-muted-foreground">
              {status.connected
                ? `Tipo: ${status.type === "serial" ? "USB" : "Bluetooth"}`
                : reconnecting
                ? "Intentando reconectar automáticamente..."
                : getSavedPrinterInfo()
                ? "Se reconectará automáticamente al abrir la app"
                : "Los recibos se abrirán en una ventana para imprimir"}
            </p>
          </div>
          {status.connected && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
        </div>

        {/* Connection Buttons */}
        {!status.connected ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleConnectUSB}
              disabled={connecting || !isSerialSupported}
              variant="outline"
              className="flex-1"
            >
              <Usb className="h-4 w-4 mr-2" />
              {connecting ? "Conectando..." : "Conectar USB"}
            </Button>
            <Button
              onClick={handleConnectBluetooth}
              disabled={connecting || !isBluetoothSupported}
              variant="outline"
              className="flex-1"
            >
              <Bluetooth className="h-4 w-4 mr-2" />
              {connecting ? "Conectando..." : "Conectar Bluetooth"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleTestPrint} variant="outline" className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Prueba de Impresión
            </Button>
            <Button
              onClick={handleDisconnect}
              variant="destructive"
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Unplug className="h-4 w-4 mr-2" />
              Desconectar
            </Button>
          </div>
        )}

        {/* Browser Support Warnings */}
        {!isSerialSupported && !isBluetoothSupported && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Tu navegador no soporta Web Serial ni Web Bluetooth. Usa Google
            Chrome o Microsoft Edge para conectar impresoras directamente.
          </p>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
          <p className="font-medium">Instrucciones:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>
              <strong>USB:</strong> Conecta la impresora por cable y haz clic en
              &quot;Conectar USB&quot;. Selecciona el puerto en la ventana del navegador.
            </li>
            <li>
              <strong>Bluetooth:</strong> Enciende el Bluetooth, empareja la
              impresora en tu PC/celular, y haz clic en &quot;Conectar Bluetooth&quot;.
            </li>
            <li>
              Una vez conectada, al imprimir un recibo se enviará directamente
              sin abrir ventanas emergentes.
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Small inline status badge for the printer, usable in headers/navbars.
 */
export const PrinterStatusBadge = () => {
  const [status, setStatus] = useState({ connected: false, type: "none" as string, name: "" });

  useEffect(() => {
    setStatus(getPrinterStatus());
    const interval = setInterval(() => {
      setStatus(getPrinterStatus());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!status.connected) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 shrink-0">
      <Printer className="h-3 w-3" />
      <span className="hidden sm:inline">
        {status.type === "serial" ? "USB" : "BT"}
      </span>
    </span>
  );
};

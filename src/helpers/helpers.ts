const cTypes = {
    'uint8_t': { 'size': 1 },
    'uint16_t': { 'size': 2 },
    'uint32_t': { 'size': 4 },
    'int8_t': { 'size': 1 },
    'int16_t': { 'size': 2 },
    'int32_t': { 'size': 4 },
    'float': { 'size': 4 },
    'double': { 'size': 8 },
    'char': { 'size': 1 },
    'hex': { 'size': 1 }
    // 'enum': { 'size': 1 },
}

export type CType = keyof typeof cTypes;

export type SensoryData = {
    /**
     * Display Name
     */
    name: string;
    /**
     * Encoded data type
     */
    type: CType,
    conversion?: {
        /**
         * Human-readable
         */
        'encoded_units'?: string,
        /**
         * Human-readable
         */
        'decoded_units'?: string,
        /**
         * Coefficients , input to output
         */
        coeffs?: number[],
        /**
         * TODO: Enum types
         */
        enum?: Record<string | number, string>,
        /**
         * TODO: Bitmap types
         */
        bitmap?: Record<string | number, string>,
        /**
         * Precision
         * TODO
         */
        precision?: number;
    },
    /**
     * @default false
     */
    bigEndian?: boolean;
    /**
     * Human-readable comment
     */
    comment?: string;
};

export class FrameDecoder {

    availableSensors: Record<string, SensoryData> = {};
    sensorsOrder: string[] = [];

    constructor(availableSensors: Record<string, SensoryData>) {
        this.availableSensors = availableSensors;
    }

    setOrder(order: string[]) {
        this.sensorsOrder = order;
    }

    decode(inputStringHex: string) {
        if (!inputStringHex || !this.sensorsOrder) {
            return null;
        }

        // One byte is two hex characters
        const bytesFromHex = inputStringHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16));
        const buffer = new Uint8Array(bytesFromHex).buffer;
        const view = new DataView(buffer);
        // Return object
        // TODO: more then numbers
        const dataObject: Record<string, number | string> = {};
        // Read offset
        let bytesOffset = 0;

        for (const sensorName of this.sensorsOrder) {
            const sensorConfig: SensoryData = this.availableSensors[sensorName];
            if (!sensorConfig) {
                console.error(`Sensor ${sensorName} was not found in the config ${this.availableSensors}`);
            }
            const dataSizeInBytes = cTypes[sensorConfig.type].size;
            const littleEndian = !sensorConfig.bigEndian;
            let value: number | string | null = null;

            if (sensorConfig.type === 'uint32_t') {
                value = view.getUint32(bytesOffset, littleEndian);
            } else if (sensorConfig.type === 'int32_t') {
                value = view.getInt32(bytesOffset, littleEndian);
            } else if (sensorConfig.type === 'uint16_t') {
                value = view.getUint16(bytesOffset, littleEndian);
            } else if (sensorConfig.type === 'int16_t') {
                value = view.getUint16(bytesOffset, littleEndian);
            } else if (sensorConfig.type === 'uint8_t') {
                value = view.getUint8(bytesOffset);
            } else if (sensorConfig.type === 'int8_t') {
                value = view.getInt8(bytesOffset);
            } else if (sensorConfig.type === 'float') {
                value = view.getFloat32(bytesOffset);
            } else if (sensorConfig.type === 'double') {
                value = view.getFloat64(bytesOffset);
            } else if (sensorConfig.type === 'char') {
                const partialDataView = new DataView(view.buffer, bytesOffset, dataSizeInBytes);
                const partialByteArray = new Uint8Array(partialDataView.buffer);
                value = Array.from(partialByteArray, byte => String.fromCharCode(byte)).join('');
            } else if (sensorConfig.type === 'hex') {
                const partialDataView = new DataView(view.buffer, bytesOffset, dataSizeInBytes);
                const partialByteArray = new Uint8Array(partialDataView.buffer);
                value = Array.from(partialByteArray, byte => byte.toString(16).padStart(2, '0')).join('')
            }

            /**
             * coeffs[0] => add to value ( as offset )
             * coeffs[1] => multiply with value ( as coefficient )
             */
            if (sensorConfig.conversion?.coeffs && typeof value === 'number') {
                const x = value;
                let y = 0;
                for (let k = 0; k < sensorConfig.conversion.coeffs.length; k++) {
                    y += Math.pow(x, k) * sensorConfig.conversion.coeffs[k];
                }
                value = y;
            }
            if (value) {
                dataObject[sensorName] = value;
            } else {
                console.warn(`Unable to parse ${sensorName}`);
            }
            bytesOffset += dataSizeInBytes;
        }
        return dataObject;
    }
}

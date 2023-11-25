import { useCallback, useMemo, useState } from "react";
import {
  Container,
  Button,
  TextField,
  Box,
  Chip,
  Stack,
  Avatar,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Snackbar,
  AlertTitle,
  styled,
  Typography,
} from "@mui/material";
import { SensoryData, FrameDecoder } from "./helpers/helpers";

const latLngScaleFactor = 1e-6;

export const availableSensors = {
  RTCtimestamp: {
    name: "RTCtimestamp",
    type: "uint32_t",
    comment: "RTC timestamp",
  },
  GPStimestamp: {
    name: "GPStimestamp",
    type: "uint32_t",
    comment: "GPS timestamp",
  },
  GPSlat: {
    name: "GPSlat",
    type: "int32_t",
    comment: "GPS latitude",
    conversion: {
      decoded_units: "100000/1 lat true",
      encoded_units: "lat true",
      coeffs: [0, latLngScaleFactor],
    },
  },
  GPSlng: {
    name: "GPSlng",
    type: "int32_t",
    comment: "GPS longitude",
    conversion: {
      decoded_units: "100000/1 lng true",
      encoded_units: "lng true",
      coeffs: [0, latLngScaleFactor],
    },
  },
  temperature: {
    name: "temperature",
    type: "int16_t",
    comment: "Degree Celsius",
    conversion: {
      decoded_units: "100/1 degrees true",
      encoded_units: "degrees true",
      coeffs: [0, 0.01],
    },
  },
  humidity: {
    name: "humidity",
    type: "uint16_t",
    comment: "Humidity %RH",
    conversion: {
      decoded_units: "100/1 %RH true",
      encoded_units: "%RH true",
      coeffs: [0, 0.01],
    },
  },
  pressure: {
    name: "pressure",
    type: "uint16_t",
    comment: "Pressure hPa",
    conversion: {
      decoded_units: "10/1 hPa true",
      encoded_units: "hPa true",
      coeffs: [0, 0.1],
    },
  },
  voltage: {
    name: "voltage",
    type: "uint16_t",
    comment: "Volts",
    conversion: {
      decoded_units: "100/1 V true",
      encoded_units: "V true",
      coeffs: [0, 0.01],
    },
  },
  GPSsats: {
    name: "GPSsats",
    type: "uint8_t",
    comment: "Number of GPS satellites",
    conversion: {
      decoded_units: "Number of satellites true",
      encoded_units: "Number of satellites true",
      coeffs: [0, 1],
    },
  },
} satisfies Record<string, SensoryData>;

const messagesOrder = [
  "RTCtimestamp",
  "GPStimestamp",
  "GPSlat",
  "GPSlng",
  "temperature",
  "humidity",
  "pressure",
  "voltage",
  "GPSsats",
];

const ScrollableStack = styled(Stack)`
  overflow-x: auto;
`;

function App() {
  const [hexString, setHexString] = useState("0b8cfe630e70fe63282d44fc34e866fcb0021c1268260a030c");
  const [showConfig, setShowConfig] = useState(false);
  const [openChipConfig, setOpenChipConfig] = useState<string | null>(null);
  const [showDataOrder, setShowDataOrder] = useState(true);
  const [decodedFrame, setDecodedFrame] = useState<Record<string, number | string> | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [showSampleData, setShowSampleData] = useState(false);

  const decoder = useMemo(() => {
    const _decoder = new FrameDecoder(availableSensors);
    _decoder.setOrder(messagesOrder);
    return _decoder;
  }, []);

  const decodeFrame = useCallback(() => {
    try {
      const decodedData = decoder.decode(hexString);
      if (decodedData) {
        setDecodedFrame(decodedData);
        console.log(decodedData);
      }
    } catch (error) {
      setShowAlert(true);
      console.error(error);
    }
  }, [decoder, hexString]);

  return (
    <>
      <Container maxWidth={"lg"}>
        <Box mt={3} pb={4}>
          <ScrollableStack direction="row" spacing={1} useFlexGap>
            <Button variant="outlined" onClick={() => setShowConfig(true)}>
              Show Configuration
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowDataOrder((dataOrder) => !dataOrder)}
              color={showDataOrder ? "warning" : "primary"}
            >
              {showDataOrder ? "Hide frame sequence" : "Show frame sequence"}
            </Button>
            <Button variant="outlined" color="secondary" onClick={() => setShowSampleData(true)}>
              Sample data
            </Button>
          </ScrollableStack>
        </Box>
        <Collapse in={showDataOrder}>
          <Box>
            <ScrollableStack direction="row" spacing={1}>
              {messagesOrder.map((name, index) => (
                <Chip
                  label={name}
                  key={name}
                  avatar={<Avatar>{index + 1}</Avatar>}
                  onClick={() => setOpenChipConfig(name)}
                ></Chip>
              ))}
            </ScrollableStack>
          </Box>
        </Collapse>
        <Box mt={4}>
          <TextField
            value={hexString}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setHexString(event.target.value);
            }}
            variant="outlined"
            fullWidth
          />
          <Button variant="contained" fullWidth disabled={hexString.length === 0} onClick={decodeFrame}>
            Decode Frame
          </Button>
        </Box>
        <Collapse in={decodedFrame !== null}>
          {decodedFrame && (
            <Box pt={4}>
              <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell align="left">Measure</TableCell>
                      <TableCell align="right">Comment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(decodedFrame as Record<string, number>).map(([key, value]) => (
                      <TableRow key={key} hover={true}>
                        <TableCell component="th" scope="row">
                          {key}
                        </TableCell>
                        <TableCell align="left">
                          {value}
                          {key.includes("timestamp") && (
                            <Typography ml={3} variant="overline">({new Date(value * 1000).toISOString()})</Typography>
                          )}
                        </TableCell>
                        {/** eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        <TableCell align="right">
                          {availableSensors[key as keyof typeof availableSensors]?.comment}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Collapse>
      </Container>

      {/* Config */}
      <Dialog open={showConfig} onClose={() => setShowConfig(false)} scroll="paper">
        <DialogTitle>Sensors Configuration</DialogTitle>
        <DialogContent>
          <DialogContentText whiteSpace={"pre-line"}>
            <pre>{JSON.stringify(availableSensors, null, 2)}</pre>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfig(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Sensor info */}
      <Dialog open={!!openChipConfig} onClose={() => setOpenChipConfig(null)} scroll="paper">
        <DialogTitle>{openChipConfig}</DialogTitle>
        <DialogContent>
          <DialogContentText whiteSpace={"pre-line"}>
            <pre>{JSON.stringify(availableSensors[openChipConfig as keyof typeof availableSensors], null, 2)}</pre>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenChipConfig(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Sample data */}
      <Dialog open={showSampleData} onClose={() => setShowSampleData(false)}>
        <DialogTitle>Sample Data</DialogTitle>
        <DialogContent>
          {[
            "938bfe63966ffe633c2d44fc14e866fcb2021812692609030c",
            "D38bfe63d66ffe63302d44fc34e866fcb002181269260a030c",
            "0b8cfe630e70fe63282d44fc34e866fcb0021c1268260a030c",
            "828cfe638570fe632c2d44fc24e866fcb0022912692609030c",
          ].map((data) => (
            <Button
              fullWidth
              key={data}
              onClick={() => {
                setHexString(data);
                setShowSampleData(false);
              }}
            >
              {data}
            </Button>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSampleData(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Error  */}
      <Snackbar open={showAlert} autoHideDuration={6000} onClose={() => setShowAlert(false)}>
        <Alert onClose={() => setShowAlert(false)} severity="error" sx={{ width: "100%" }} variant="filled">
          <AlertTitle>Error</AlertTitle>
          There was an error while trying to parse the frame :( Check console for more info
        </Alert>
      </Snackbar>
    </>
  );
}

export default App;

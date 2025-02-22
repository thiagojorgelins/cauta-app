import ButtonCustom from "@/components/Button";
import ConfirmationModal from "@/components/ConfirmationModal";
import Select from "@/components/Select";
import { getVocalizacoes } from "@/services/vocalizacoesService";
import { Vocalizacao } from "@/types/Vocalizacao";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { FFmpegKit } from "ffmpeg-kit-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import BackgroundTimer from "react-native-background-timer";
import { showMessage } from "react-native-flash-message";

export default function HomeScreen() {
  const router = useRouter();
  const appState = useRef(AppState.currentState);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showVocalizationModal, setShowVocalizationModal] = useState(false);
  const [vocalizations, setVocalizations] = useState<Vocalizacao[]>([]);
  const [selectedVocalizationId, setSelectedVocalizationId] = useState<
    number | null
  >(null);
  const [loadingVocalizations, setLoadingVocalizations] = useState(false);
  const [recordingSegments, setRecordingSegments] = useState<string[]>([]);
  const [elapsedTimeBeforePause, setElapsedTimeBeforePause] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);

  const startTimeRef = useRef<number | null>(null);
  const notificationRef = useRef<string | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    const setup = async () => {
      await setupApp();
      await checkExistingRecording();
    };

    setup();
    return () => {
      cleanup();
    };
  }, []);

  const checkExistingRecording = async () => {
    try {
      const startTimeStr = await AsyncStorage.getItem("recordingStartTime");
      const isRecording = await AsyncStorage.getItem("isRecording");
      const savedElapsedTime = await AsyncStorage.getItem(
        "elapsedTimeBeforePause"
      );

      if (startTimeStr && isRecording === "true") {
        const startTime = parseInt(startTimeStr);
        startTimeRef.current = startTime;

        const elapsedTime = savedElapsedTime ? parseInt(savedElapsedTime) : 0;
        setElapsedTimeBeforePause(elapsedTime);

        const currentTime = Math.floor((Date.now() - startTime) / 1000);
        setDisplayTime(currentTime);
        setRecordingTime(currentTime);

        startTimer();
      }
    } catch (error) {
      showMessage({
        message: "Erro",
        description: "Não foi possível verificar a gravação existente",
        type: "danger",
      });
    }
  };

  const setupApp = async () => {
    await setupAudioMode();
    await setupNotifications();
    setupAppStateListener();
  };

  const setupAudioMode = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (granted) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          playThroughEarpieceAndroid: false,
        });
      }
    } catch (error) {
      showMessage({
        message: "Erro",
        description: "Não foi possível configurar o modo de áudio",
        type: "danger",
      });
    }
  };

  const setupNotifications = async () => {
    try {
      const { status, granted } = await Notifications.requestPermissionsAsync();

      if (status === "denied") {
        showMessage({
          message: "Permissão Negada",
          description:
            "As notificações foram desativadas. Por favor, ative nas configurações do dispositivo.",
          type: "warning",
        });
        return;
      }

      if (granted) {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("recording", {
            name: "Gravação",
            importance: Notifications.AndroidImportance.HIGH,
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
            enableVibrate: false,
            enableLights: false,
            showBadge: false,
            sound: null,
          });
        }

        await Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldVibrate: false,
            priority: Notifications.AndroidNotificationPriority.MAX,
          }),
        });
      } else {
        showMessage({
          message: "Notificações Desativadas",
          description:
            "Algumas funcionalidades podem ser limitadas sem permissão de notificação.",
          type: "warning",
        });
      }
    } catch (error) {
      showMessage({
        message: "Erro",
        description: "Não foi possível configurar as notificações",
        type: "danger",
      });
    }
  };

  const setupAppStateListener = () => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (
          recording &&
          appState.current.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          if (startTimeRef.current) {
            const elapsedSeconds = Math.floor(
              (Date.now() - startTimeRef.current) / 1000
            );
            setRecordingTime(elapsedSeconds);
            updateNotification(elapsedSeconds);
          }
        }
        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  };

  const startTimer = async () => {
    BackgroundTimer.stopBackgroundTimer();

    await AsyncStorage.setItem(
      "recordingStartTime",
      startTimeRef.current!.toString()
    );
    await AsyncStorage.setItem("isRecording", "true");
    await AsyncStorage.setItem(
      "elapsedTimeBeforePause",
      elapsedTimeBeforePause.toString()
    );

    BackgroundTimer.runBackgroundTimer(() => {
      if (startTimeRef.current) {
        const currentTime = Math.floor(
          (Date.now() - startTimeRef.current) / 1000
        );
        const totalTime = currentTime;
        setDisplayTime(totalTime);
        setRecordingTime(totalTime);
        updateNotification(totalTime);
      }
    }, 1000);
  };

  const stopTimer = async () => {
    BackgroundTimer.stopBackgroundTimer();

    startTimeRef.current = null;

    await AsyncStorage.removeItem("recordingStartTime");
    await AsyncStorage.removeItem("isRecording");

    if (notificationRef.current) {
      await Notifications.dismissNotificationAsync(notificationRef.current);
      notificationRef.current = null;
      await AsyncStorage.removeItem("currentNotificationId");
    }
  };

  const updateNotification = async (time: number = recordingTime) => {
    try {
      if (!notificationRef.current) {
        const identifier = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Gravação em andamento",
            body: `Tempo: ${formatTime(time)}`,
            data: { type: "recording" },
            priority: Platform.OS === "android" ? "max" : undefined,
            sound: false,
            sticky: true,
          },
          trigger: null,
        });
        notificationRef.current = identifier;
        await AsyncStorage.setItem("currentNotificationId", identifier);
      } else {
        await Notifications.scheduleNotificationAsync({
          identifier: notificationRef.current,
          content: {
            title: "Gravação em andamento",
            body: `Tempo: ${formatTime(time)}`,
            data: { type: "recording" },
            priority: Platform.OS === "android" ? "max" : undefined,
            sound: false,
            sticky: true,
          },
          trigger: null,
        });
      }
    } catch (error) {
      showMessage({
        message: "Erro",
        description: "Não foi possível atualizar a notificação",
        type: "danger",
      });
    }
  };

  const cleanup = async () => {
    if (recording) {
      await stopRecording();
    }
    if (notificationRef.current) {
      await Notifications.dismissNotificationAsync(notificationRef.current);
      notificationRef.current = null;
    }
    stopTimer();
    BackgroundTimer.stopBackgroundTimer();
  };

  useEffect(() => {
    return () => {
      BackgroundTimer.stopBackgroundTimer();
    };
  }, []);

  const startRecording = async () => {
    try {
      const { granted } = await Audio.getPermissionsAsync();
      if (!granted) {
        showMessage({
          message: "Permissão Negada",
          description: "Não há permissão para gravar áudio",
          type: "danger",
        });
        return;
      }

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
        isMeteringEnabled: true,
        android: {
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: undefined,
          bitsPerSecond: undefined,
        },
      });

      await newRecording.startAsync();
      setRecording(newRecording);
      setIsPaused(false);

      startTimeRef.current = Date.now() - elapsedTimeBeforePause * 1000;
      startTimer();
      updateNotification(elapsedTimeBeforePause);
    } catch (error) {
      showMessage({
        message: "Erro ao gravar",
        description: "Não foi possível iniciar a gravação do áudio",
        type: "danger",
      });
    }
  };

  const stopRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        if (uri) {
          setRecordingSegments((prev) => [...prev, uri]);
          setElapsedTimeBeforePause(displayTime);
        }
        setRecording(null);
        stopTimer();
        setIsPaused(true);

        if (notificationRef.current) {
          await Notifications.dismissNotificationAsync(notificationRef.current);
          notificationRef.current = null;
        }
      }
    } catch (error) {
      showMessage({
        message: "Erro ao pausar",
        description: "Não foi possível parar a gravação do áudio",
        type: "danger",
      });
    }
  };

  const handleDiscard = async () => {
    for (const uri of recordingSegments) {
      try {
        await FileSystem.deleteAsync(uri);
      } catch (error) {
        showMessage({
          message: "Erro",
          description: "Não foi possível descartar a gravação",
          type: "danger",
        });
      }
    }

    setRecordingSegments([]);
    setElapsedTimeBeforePause(0);
    setDisplayTime(0);
    setRecordingTime(0);
    setIsPaused(false);
    setShowDiscardModal(false);
  };

  const concatenateAudioSegments = async () => {
    if (recordingSegments.length === 0) return null;
    if (recordingSegments.length === 1) return recordingSegments[0];

    try {
      const tempDirectory = `${FileSystem.cacheDirectory}temp_audio/`;
      await FileSystem.makeDirectoryAsync(tempDirectory, {
        intermediates: true,
      });

      const finalPath = `${tempDirectory}final_recording_${Date.now()}.m4a`;
      const fileList = `${tempDirectory}filelist.txt`;

      const fileListContent = recordingSegments
        .map((uri) => {
          const cleanUri = uri.replace("file://", "");
          return `file '${cleanUri}'`;
        })
        .join("\n");

      await FileSystem.writeAsStringAsync(fileList, fileListContent);

      const command = `-f concat -safe 0 -i ${fileList} -c copy ${finalPath}`;

      const session = await FFmpegKit.execute(command);
      const returnCode = await session.getReturnCode();

      await FileSystem.deleteAsync(fileList);

      if (returnCode.isValueSuccess()) {
        for (const uri of recordingSegments) {
          try {
            await FileSystem.deleteAsync(uri);
          } catch (error) {
            showMessage({
              message: "Erro",
              description: "Não foi possível deletar o segmento de áudio",
              type: "danger",
            });
          }
        }
        return finalPath;
      } else {
        showMessage({
          message: "Erro",
          description: "Falha ao juntar os segmentos de áudio",
          type: "danger",
        });
        return recordingSegments[0];
      }
    } catch (error) {
      showMessage({
        message: "Erro",
        description: "Não foi possível juntar os segmentos de áudio",
        type: "danger",
      });
      return recordingSegments[0];
    }
  };

  async function fetchVocalizations() {
    setLoadingVocalizations(true);
    try {
      const vocalizations = await getVocalizacoes();
      setVocalizations(vocalizations);

      if (!selectedVocalizationId && vocalizations.length > 0) {
        setSelectedVocalizationId(vocalizations[0].id);
      }
    } catch (error: any) {
      showMessage({
        message: "Erro",
        description: "Não foi possível carregar os rótulos de vocalizações",
        type: "danger",
      });
    } finally {
      setLoadingVocalizations(false);
    }
  }

  const openVocalizationModal = async () => {
    if (vocalizations.length === 0) {
      await fetchVocalizations();
    }
    setShowVocalizationModal(true);
  };

  const closeVocalizationModal = () => {
    setShowVocalizationModal(false);
  };

  const handleSaveAudio = async () => {
    if (!selectedVocalizationId) {
      showMessage({
        message: "Rótulo não selecionado",
        description: "Por favor, selecione um rótulo de vocalização.",
        type: "warning",
      });
      return;
    }

    if (recordingSegments.length === 0) {
      showMessage({
        message: "Nenhuma gravação",
        description: "Não foi encontrada gravação para salvar.",
        type: "warning",
      });
      return;
    }

    try {
      const finalUri = await concatenateAudioSegments();
      if (!finalUri) return;

      const filename = `recording_${Date.now()}.m4a`;
      const newUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.moveAsync({
        from: finalUri,
        to: newUri,
      });

      const existingRecordings = await AsyncStorage.getItem("recordings");
      const recordings = existingRecordings
        ? JSON.parse(existingRecordings)
        : [];

      recordings.push({
        uri: newUri,
        timestamp: Date.now(),
        duration: displayTime,
        vocalizationId: selectedVocalizationId,
        vocalizationName: vocalizations.find(
          (v) => v.id === selectedVocalizationId
        )?.nome,
        status: "pending",
      });

      await AsyncStorage.setItem("recordings", JSON.stringify(recordings));

      setRecordingSegments([]);
      setElapsedTimeBeforePause(0);
      setDisplayTime(0);
      setRecordingTime(0);
      setIsPaused(false);
      setShowVocalizationModal(false);

      await AsyncStorage.removeItem("recordingStartTime");
      await AsyncStorage.removeItem("isRecording");
      await AsyncStorage.removeItem("elapsedTimeBeforePause");

      router.push("/audios");
    } catch (error) {
      showMessage({
        message: "Erro ao salvar",
        description: "Não foi possível salvar o áudio",
        type: "danger",
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.timer}>{formatTime(displayTime)}</Text>

      <View style={styles.controlContainer}>
        {isPaused && (
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={() => setShowDiscardModal(true)}
              style={[styles.button, styles.discardButton]}
            >
              <MaterialIcons name="close" size={48} color="white" />
            </Pressable>
            <Text style={styles.boldText}>Descartar</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.button}
            onPress={recording ? stopRecording : startRecording}
          >
            <MaterialIcons
              name={recording ? "pause" : isPaused ? "play-arrow" : "mic"}
              size={48}
              color="white"
            />
          </Pressable>
          <Text style={styles.boldText}>
            {recording
              ? "Pausar a gravação"
              : isPaused
              ? "Continuar"
              : "Toque para iniciar a gravação"}
          </Text>
        </View>

        {isPaused && (
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={openVocalizationModal}
              style={[styles.button, styles.saveButton]}
            >
              <MaterialIcons name="save" size={48} color="white" />
            </Pressable>
            <Text style={styles.boldText}>Salvar</Text>
          </View>
        )}
      </View>

      <ConfirmationModal
        visible={showDiscardModal}
        onCancel={() => setShowDiscardModal(false)}
        onConfirm={handleDiscard}
        message="Tem certeza que deseja descartar a gravação?"
      />

      <Modal
        visible={showVocalizationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeVocalizationModal}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione o Rótulo da Vocalização</Text>

            {loadingVocalizations ? (
              <ActivityIndicator size="large" color="#000" />
            ) : (
              <Select
                label="Rótulo"
                selectedValue={selectedVocalizationId?.toString() || ""}
                onValueChange={(itemValue) =>
                  setSelectedVocalizationId(Number(itemValue))
                }
                options={vocalizations.map((voc) => ({
                  label: voc.nome,
                  value: voc.id.toString(),
                }))}
                style={{ width: "100%" }}
              />
            )}

            <View style={styles.buttonRow}>
              <ButtonCustom
                title="Salvar"
                onPress={handleSaveAudio}
                style={{ width: "45%" }}
              />
              <ButtonCustom
                title="Fechar"
                onPress={closeVocalizationModal}
                color="red"
                style={{ width: "45%" }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    height: 40,
    paddingHorizontal: 8,
    width: 100,
    textAlign: "center",
  },
  timer: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 54,
  },
  controlContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  buttonContainer: {
    alignItems: "center",
    marginHorizontal: 8,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 50,
    backgroundColor: "#ff0000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  discardButton: {
    backgroundColor: "gray",
  },
  saveButton: {
    backgroundColor: "green",
  },
  boldText: {
    fontWeight: "bold",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
});

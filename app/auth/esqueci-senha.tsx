import ButtonCustom from "@/components/Button";
import ConfirmationModal from "@/components/ConfirmationModal";
import Input from "@/components/Inputs/Input";
import { requestPasswordReset } from "@/services/authService";
import { validarEmail } from "@/services/usuarioService";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [codigoConfirmacao, setCodigoConfirmacao] = useState("");
  const [emailError, setEmailError] = useState("");
  const [codigoError, setCodigoError] = useState("");
  const router = useRouter();

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (!text.trim()) {
      setEmailError("Email é obrigatório");
    } else if (!validarEmail(text)) {
      setEmailError("Formato de email inválido");
    } else {
      setEmailError("");
    }
  };

  async function handleForgotPassword() {
    if (!email.trim()) {
      setEmailError("Informe seu email");
      return;
    }

    if (!validarEmail(email)) {
      setEmailError("Formato de email inválido");
      return;
    }

    setIsLoading(true);
    try {
      await requestPasswordReset(email);
      Toast.show({
        type: "success",
        text1: "Código enviado com sucesso!",
        text2: "Um código de recuperação foi enviado para o email informado.",
      });
      setIsModalVisible(true);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error instanceof Error ? error.message : "Erro",
        text2: "Não foi possível enviar o código de recuperação.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmResetCode(codigo?: string) {
    if (!codigo) {
      setCodigoError("Código é obrigatório");
      return;
    }

    setIsModalLoading(true);
    try {
      setIsModalVisible(false);
      router.push({
        pathname: "/auth/trocar-senha",
        params: { email, codigoConfirmacao: codigo },
      });
    } catch (error: any) {
      setCodigoError("Código de recuperação inválido");
      Toast.show({
        type: "error",
        text1: error instanceof Error ? error.message : "Erro",
        text2: "O código informado não é válido.",
      });
    } finally {
      setIsModalLoading(false);
    }
  }

  async function handleResendCode() {
    setIsModalLoading(true);
    try {
      await requestPasswordReset(email);
      Toast.show({
        type: "success",
        text1: "Código reenviado com sucesso!",
        text2: "Um novo código foi enviado para o email informado.",
      });
      setCodigoError("");
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: error instanceof Error ? error.message : "Erro",
        text2: "Não foi possível reenviar o código.",
      });
    } finally {
      setIsModalLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={"height"} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <MaterialIcons name="lock-reset" size={40} color="#2196F3" />
          <Text style={styles.title}>Recuperação de Senha</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.description}>
              Por favor, informe o endereço de email associado a sua conta para
              que possamos enviar um código para recuperação da sua senha
            </Text>

            <Input
              label="Email"
              placeholder="Informe seu email"
              value={email}
              showCharacterCount={true}
              maxLength={80}
              onChangeText={handleEmailChange}
              leftIcon={<MaterialIcons name="email" size={20} color="#666" />}
              keyboardType="email-address"
              error={!!emailError}
              errorMessage={emailError}
            />
          </View>

          <View style={styles.actions}>
            {isLoading ? (
              <ActivityIndicator
                size="large"
                color="#2196F3"
                style={styles.loader}
              />
            ) : (
              <ButtonCustom
                title="Recuperar Senha"
                onPress={handleForgotPassword}
                color="#2196F3"
                style={styles.mainButton}
                icon={<MaterialIcons name="send" size={20} color="#FFF" />}
                disabled={!!emailError || !email.trim()}
              />
            )}

            <ButtonCustom
              title="Voltar para Login"
              variant="secondary"
              onPress={() => router.back()}
              icon={
                <MaterialIcons name="arrow-back" size={20} color="#424242" />
              }
              disabled={isLoading}
            />
          </View>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onConfirm={handleConfirmResetCode}
        onResend={handleResendCode}
        showResendButton={true}
        message="Digite o código de recuperação enviado para o seu e-mail."
        input={{
          placeholder: "Código de recuperação",
          value: codigoConfirmacao,
          onChangeText: setCodigoConfirmacao,
          keyboardType: "numeric",
        }}
        error={!!codigoError}
        errorMessage={codigoError}
        isLoading={isModalLoading}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#212121",
    letterSpacing: 0.25,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    margin: 16,
    padding: 20,
    elevation: 3,
  },
  section: {
    marginBottom: 24,
    gap: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  actions: {
    gap: 16,
  },
  mainButton: {
    height: 48,
    borderRadius: 24,
  },
  loader: {
    marginVertical: 20,
  },
});

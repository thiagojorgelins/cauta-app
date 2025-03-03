import ButtonCustom from "@/components/Button";
import ConfirmationModal from "@/components/ConfirmationModal";
import Input from "@/components/Inputs/Input";
import { deleteUser, getAllUsers, updateUserAdmin } from "@/services/usuarioService";
import { Usuario } from "@/types/Usuario";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { showMessage } from "react-native-flash-message";

export default function UsuariosScreen() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [selectedUsuario, setSelectedUsuario] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    setIsLoading(true);
    try {
      const users = await getAllUsers();
      setUsuarios(users);
    } catch (error: any) {
      showMessage({
        message: "Erro",
        description: error.message || "Não foi possível carregar os usuários",
        type: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUsuarios();
    }, [fetchUsuarios])
  );

  const handleEdit = (usuario: any) => {
    setSelectedUsuario(usuario);
    setNome(usuario.nome || "");
    setEmail(usuario.email || "");
    setCelular(usuario.celular || "");
    setShowModal(true);
  };

  const validateForm = () => {
    if (!nome.trim()) {
      showMessage({
        message: "Erro",
        description: "O nome é obrigatório",
        type: "warning",
      });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!selectedUsuario) return;
    if (!validateForm()) return;
  
    setIsLoading(true);
    try {
      const updateData: Usuario = {
        id: selectedUsuario.id,
        nome: nome.trim(),
        email: selectedUsuario.email,
        celular: celular.trim(),
      };
  
      await updateUserAdmin(updateData);
  
      showMessage({
        message: "Sucesso",
        description: "Dados do usuário atualizados com sucesso!",
        type: "success",
      });
  
      setShowModal(false);
      await fetchUsuarios();
    } catch (error: any) {
      showMessage({
        message: "Erro",
        description: error.message || "Erro ao atualizar os dados do usuário",
        type: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUsuario) return;

    try {
      await deleteUser(selectedUsuario.id);

      showMessage({
        message: "Sucesso",
        description: "Usuário deletado com sucesso!",
        type: "success",
      });

      setShowConfirmModal(false);
      fetchUsuarios();
    } catch (error: any) {
      showMessage({
        message: "Erro",
        description: "Erro ao deletar o usuário",
        type: "danger",
      });
    }
  };

  const renderUsuario = ({ item }: { item: any }) => (
    <View style={styles.userContainer}>
      <View style={styles.userInfoContainer}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.nome}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => handleEdit(item)}
              style={styles.iconButton}
            >
              <MaterialIcons name="edit" size={24} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectedUsuario(item);
                setShowConfirmModal(true);
              }}
              style={styles.iconButton}
            >
              <MaterialIcons name="delete" size={24} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.userDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="email" size={20} color="#666" />
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="phone" size={20} color="#666" />
            <Text style={styles.detailText}>{item.celular}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={usuarios}
        renderItem={renderUsuario}
        keyExtractor={(usuario) => usuario.id.toString()}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="person-off" size={48} color="#666" />
              <Text style={styles.emptyText}>Não há usuários cadastrados.</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContainer}
        refreshing={isLoading}
        onRefresh={fetchUsuarios}
      />

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Usuário</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.modalClose}
                disabled={isLoading}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Input
              label="Nome"
              value={nome}
              onChangeText={setNome}
              editable={!isLoading}
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
              leftIcon={<MaterialIcons name="email" size={20} color="#666" />}
            />
            <Input
              label="Celular"
              value={celular}
              mask="(99) 99999-9999"
              maxLength={15}
              onChangeText={setCelular}
              keyboardType="phone-pad"
              editable={!isLoading}
            />

            <View style={styles.modalActions}>
              <ButtonCustom
                title="Salvar"
                onPress={handleSave}
                color="#2196F3"
                style={styles.modalButton}
                icon={<MaterialIcons name="save" size={20} color="#FFF" />}
                disabled={isLoading}
              />
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={showConfirmModal}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={handleDelete}
        message="Tem certeza que deseja deletar este usuário?"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 20,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  userContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfoContainer: {
    padding: 16,
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212121",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  userDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#212121",
  },
  modalClose: {
    padding: 4,
  },
  modalActions: {
    marginTop: 24,
  },
  modalButton: {
    marginVertical: 8,
  },
});

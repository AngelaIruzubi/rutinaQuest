import { View, Text, Image, TextInput, Pressable, FlatList, Modal, ScrollView } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function Home() {

  const [modalVisible, setModalVisible] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [search, setSearch] = useState('');

  const [tasks, setTasks] = useState([
    { id: '1', title: 'Hacer la cama', hora: '08:00' },
    { id: '2', title: 'Lavar los platos', hora: '12:30' },
    { id: '3', title: 'Sacar la basura', hora: '18:00' },
  ]);

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#ffffff',
      paddingTop: 60,
      paddingHorizontal: 20,
    }}>

      {/* HEADER */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
      }}>
        <Text style={{
          fontSize: 36,
          fontWeight: '600',
          color: '#A77BBE',
          marginRight: 10,
        }}>
          Mis Tareas
        </Text>

        <Ionicons name="list" size={28} color="#A77BBE" />
      </View>

      {/* SEARCH */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f2f2',
        borderRadius: 25,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginBottom: 40,
      }}>
        <TextInput
          placeholder="Buscar..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          style={{ flex: 1, fontSize: 16 }}
        />

        <Ionicons name="search" size={20} color="#999" />
      </View>

      {/* LIST */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f3f2f2',
            padding: 18,
            borderRadius: 15,
            borderColor: '#eee',
            borderWidth: 1,
            marginBottom: 15,
            elevation: 2,
          }}>
            <Text style={{ fontSize: 17, color: '#333' }}>
              {item.title}
            </Text>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
              <Text style={{ fontSize: 16, color: '#555' }}>
                {item.hora}
              </Text>

              <Ionicons name="calendar-outline" size={20} color="#A77BBE" />
            </View>
          </View>
        )}
      />

      {/* BOTÓN AGREGAR */}
      <Pressable
        onPress={() => setModalVisible(true)}
        style={{
          position: 'absolute',
          bottom: 30,
          right: 25,
          backgroundColor: '#A77BBE',
          width: 70,
          height: 70,
          borderRadius: 35,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 5,
        }}
      >
        <Ionicons name="add" size={36} color="#FFF" />
      </Pressable>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.3)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>

          <View style={{
            backgroundColor: '#F4F0F6',
            borderRadius: 20,
            padding: 20,
            width: '50%',
          }}>

            <ScrollView>

              {/* CLOSE */}
              <Pressable
                onPress={() => setModalVisible(false)}
                style={{ alignSelf: 'flex-start' }}
              >
                <Ionicons name="close" size={28} color="#A77BBE" />
              </Pressable>

              {/* INPUT */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 20,
                borderWidth: 1,
                borderColor: '#DDD',
                borderRadius: 10,
                paddingHorizontal: 10,
              }}>
                <TextInput
                  placeholder="Escribe tu tarea..."
                  value={newTask}
                  onChangeText={setNewTask}
                  style={{ flex: 1, paddingVertical: 10 }}
                />

                <Ionicons name="calendar-outline" size={22} color="#A77BBE" />
              </View>

              {/* IMAGE */}
              <View style={{
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 30,
              }}>
                <Image
                  source={require("../../assets/images/cine.png")}
                  style={{ width: 220, height: 220 }}
                  resizeMode="contain"
                />
              </View>

              {/* ADD BUTTON */}
              <Pressable
                onPress={() => {
                  if (newTask.trim() !== '') {
                    setTasks(prev => [
                      ...prev,
                      {
                        id: Date.now().toString(),
                        title: newTask,
                        hora: '08:00',
                      }
                    ]);
                    setNewTask('');
                    setModalVisible(false);
                  }
                }}
                style={{
                  backgroundColor: '#E5D9EE',
                  padding: 15,
                  borderRadius: 15,
                  alignItems: 'center',
                  marginTop: 30,
                }}
              >
                <Text style={{
                  fontSize: 22,
                  color: '#A77BBE',
                  fontWeight: '600'
                }}>
                  Añadir ✓
                </Text>
              </Pressable>

            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}





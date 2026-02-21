import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { UserProgress } from '@zelara/shared';
import { ProgressStorage } from '@zelara/state';
import type { RootStackParamList } from '../../App';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      // TODO: Implement AsyncStorage adapter
      const defaultProgress: UserProgress = {
        points: 0,
        unlockedModules: ['green'],
        availableUnlocks: [],
        lastUpdated: new Date().toISOString(),
      };
      setProgress(defaultProgress);
    } catch (error) {
      console.error('Failed to load progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!progress) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load progress</Text>
      </View>
    );
  }

  const nextUnlockThreshold = 50;
  const progressPercentage = Math.min((progress.points / nextUnlockThreshold) * 100, 100);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Zelara</Text>
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsValue}>{progress.points}</Text>
          <Text style={styles.pointsLabel}>points</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {progress.points < nextUnlockThreshold
            ? `${nextUnlockThreshold - progress.points} points to unlock Finance`
            : 'Finance module available!'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('RecyclingTask')}>
          <Text style={styles.actionButtonText}>Complete Recycling Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('DevicePairing')}>
          <Text style={styles.actionButtonText}>Link Desktop Device</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Modules</Text>
        {progress.unlockedModules.includes('green') && (
          <View style={[styles.moduleCard, styles.moduleUnlocked]}>
            <Text style={styles.moduleName}>Green</Text>
            <Text style={styles.moduleDescription}>
              Recycling tasks and carbon footprint
            </Text>
            <Text style={styles.moduleStatus}>Unlocked</Text>
          </View>
        )}
        {progress.unlockedModules.includes('finance') ? (
          <TouchableOpacity
            style={[styles.moduleCard, styles.moduleUnlocked]}
            onPress={() => navigation.navigate('Finance')}>
            <Text style={styles.moduleName}>Finance</Text>
            <Text style={styles.moduleDescription}>
              Personal finance organization
            </Text>
            <Text style={styles.moduleStatus}>Unlocked</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.moduleCard, styles.moduleLocked]}>
            <Text style={styles.moduleName}>Finance</Text>
            <Text style={styles.moduleDescription}>
              Personal finance organization
            </Text>
            <Text style={styles.moduleStatus}>
              {progress.availableUnlocks.includes('finance')
                ? 'Available to unlock!'
                : 'Locked'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  pointsValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#27ae60',
    marginRight: 8,
  },
  pointsLabel: {
    fontSize: 18,
    color: '#666',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#27ae60',
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  moduleCard: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 12,
  },
  moduleUnlocked: {
    borderColor: '#27ae60',
    backgroundColor: '#f0f9f4',
  },
  moduleLocked: {
    borderColor: '#95a5a6',
    backgroundColor: '#ecf0f1',
    opacity: 0.7,
  },
  moduleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  moduleStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27ae60',
  },
});

export default HomeScreen;

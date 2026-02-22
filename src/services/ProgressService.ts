/**
 * ProgressService - Local progress and point storage for Mobile
 *
 * Handles:
 * - Point accumulation and persistence
 * - Module unlock tracking
 * - Progress state management
 *
 * Storage: AsyncStorage (local device storage)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@zelara_progress';

interface ProgressState {
  points: number;
  unlocked_modules: string[];
  available_unlocks: string[];
  tasks_completed: string[];
  last_updated: string;
}

const DEFAULT_PROGRESS: ProgressState = {
  points: 0,
  unlocked_modules: ['green'], // Green module unlocked by default
  available_unlocks: [], // Finance unlocks at 50 points
  tasks_completed: [],
  last_updated: new Date().toISOString(),
};

// Module unlock thresholds
const UNLOCK_THRESHOLDS = {
  finance: 50,
  // Future modules:
  // productivity: 100,
  // homeowner: 200,
};

class ProgressService {
  private cachedProgress: ProgressState | null = null;

  /**
   * Load progress from AsyncStorage
   */
  async loadProgress(): Promise<ProgressState> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);

      if (!json) {
        // First time user - initialize with defaults
        await this.saveProgress(DEFAULT_PROGRESS);
        this.cachedProgress = DEFAULT_PROGRESS;
        return DEFAULT_PROGRESS;
      }

      const progress = JSON.parse(json) as ProgressState;
      this.cachedProgress = progress;
      return progress;
    } catch (error) {
      console.error('Failed to load progress:', error);
      // Fallback to default if storage fails
      return DEFAULT_PROGRESS;
    }
  }

  /**
   * Save progress to AsyncStorage
   */
  async saveProgress(progress: ProgressState): Promise<void> {
    try {
      progress.last_updated = new Date().toISOString();
      const json = JSON.stringify(progress);
      await AsyncStorage.setItem(STORAGE_KEY, json);
      this.cachedProgress = progress;
    } catch (error) {
      console.error('Failed to save progress:', error);
      throw new Error('Failed to save progress');
    }
  }

  /**
   * Award points and check for unlocks
   */
  async awardPoints(amount: number, taskId?: string): Promise<{
    newPoints: number;
    unlockedModules: string[];
  }> {
    const progress = await this.loadProgress();

    // Add points
    progress.points += amount;

    // Track task completion if taskId provided
    if (taskId && !progress.tasks_completed.includes(taskId)) {
      progress.tasks_completed.push(taskId);
    }

    // Check for new unlocks
    const newlyUnlocked: string[] = [];

    for (const [moduleName, threshold] of Object.entries(UNLOCK_THRESHOLDS)) {
      if (
        progress.points >= threshold &&
        !progress.unlocked_modules.includes(moduleName) &&
        !progress.available_unlocks.includes(moduleName)
      ) {
        progress.available_unlocks.push(moduleName);
        newlyUnlocked.push(moduleName);
      }
    }

    await this.saveProgress(progress);

    return {
      newPoints: progress.points,
      unlockedModules: newlyUnlocked,
    };
  }

  /**
   * Get current points
   */
  async getPoints(): Promise<number> {
    const progress = await this.loadProgress();
    return progress.points;
  }

  /**
   * Get unlocked modules
   */
  async getUnlockedModules(): Promise<string[]> {
    const progress = await this.loadProgress();
    return progress.unlocked_modules;
  }

  /**
   * Get available unlocks (modules that can be unlocked but haven't been installed yet)
   */
  async getAvailableUnlocks(): Promise<string[]> {
    const progress = await this.loadProgress();
    return progress.available_unlocks;
  }

  /**
   * Mark a module as unlocked (after conditional build)
   */
  async unlockModule(moduleName: string): Promise<void> {
    const progress = await this.loadProgress();

    // Move from available_unlocks to unlocked_modules
    progress.available_unlocks = progress.available_unlocks.filter(
      m => m !== moduleName
    );

    if (!progress.unlocked_modules.includes(moduleName)) {
      progress.unlocked_modules.push(moduleName);
    }

    await this.saveProgress(progress);
  }

  /**
   * Reset progress (for testing)
   */
  async resetProgress(): Promise<void> {
    await this.saveProgress(DEFAULT_PROGRESS);
    this.cachedProgress = DEFAULT_PROGRESS;
  }

  /**
   * Get progress toward next unlock
   */
  async getNextUnlockProgress(): Promise<{
    moduleName: string | null;
    requiredPoints: number;
    currentPoints: number;
    progress: number; // 0-1
  } | null> {
    const progress = await this.loadProgress();

    // Find next unlock
    let nextModule: string | null = null;
    let nextThreshold = Infinity;

    for (const [moduleName, threshold] of Object.entries(UNLOCK_THRESHOLDS)) {
      if (
        threshold > progress.points &&
        threshold < nextThreshold &&
        !progress.unlocked_modules.includes(moduleName) &&
        !progress.available_unlocks.includes(moduleName)
      ) {
        nextModule = moduleName;
        nextThreshold = threshold;
      }
    }

    if (!nextModule) {
      return null; // All modules unlocked or available
    }

    return {
      moduleName: nextModule,
      requiredPoints: nextThreshold,
      currentPoints: progress.points,
      progress: progress.points / nextThreshold,
    };
  }
}

export default new ProgressService();

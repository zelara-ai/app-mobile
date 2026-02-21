import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type FinanceScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Finance'
>;

interface Props {
  navigation: FinanceScreenNavigationProp;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

const FinanceScreen: React.FC<Props> = ({ navigation }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');

  const categories = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Other'];

  const addExpense = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const newExpense: Expense = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      category,
      description: description || 'No description',
      date: new Date().toISOString(),
    };

    setExpenses([newExpense, ...expenses]);
    setAmount('');
    setDescription('');
    Alert.alert('Success', 'Expense logged successfully');
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Finance Module</Text>
        <Text style={styles.subtitle}>Track your expenses and donations</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={styles.summaryValue}>${totalExpenses.toFixed(2)}</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Add Expense</Text>

          <TextInput
            style={styles.input}
            placeholder="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          <View style={styles.categoryContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonActive,
                ]}
                onPress={() => setCategory(cat)}>
                <Text
                  style={[
                    styles.categoryText,
                    category === cat && styles.categoryTextActive,
                  ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity style={styles.addButton} onPress={addExpense}>
            <Text style={styles.addButtonText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.expenseSection}>
          <Text style={styles.sectionTitle}>Recent Expenses ({expenses.length})</Text>
          {expenses.length === 0 ? (
            <Text style={styles.emptyText}>No expenses logged yet</Text>
          ) : (
            expenses.map((expense) => (
              <View key={expense.id} style={styles.expenseCard}>
                <View style={styles.expenseHeader}>
                  <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
                  <Text style={styles.expenseCategory}>{expense.category}</Text>
                </View>
                <Text style={styles.expenseDescription}>{expense.description}</Text>
                <Text style={styles.expenseDate}>
                  {new Date(expense.date).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.donationSection}>
          <Text style={styles.sectionTitle}>Donation Suggestion</Text>
          <Text style={styles.donationText}>
            Based on your finances, consider donating to green initiatives.
          </Text>
          <TouchableOpacity style={styles.donationButton}>
            <Text style={styles.donationButtonText}>Learn More</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#27ae60',
    padding: 20,
    borderRadius: 8,
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  formSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  categoryButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#27ae60',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  expenseSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  expenseCard: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    marginBottom: 8,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  expenseCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#3498db',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  expenseDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
  },
  donationSection: {
    backgroundColor: '#fef9e7',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f39c12',
  },
  donationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  donationButton: {
    backgroundColor: '#f39c12',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  donationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FinanceScreen;

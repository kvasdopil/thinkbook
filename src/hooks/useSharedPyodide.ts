import { useContext } from 'react';
import { SharedPyodideContext } from '../contexts/SharedPyodideContext';

export function useSharedPyodide() {
  const context = useContext(SharedPyodideContext);
  if (!context) {
    throw new Error(
      'useSharedPyodide must be used within a SharedPyodideProvider',
    );
  }
  return context;
}

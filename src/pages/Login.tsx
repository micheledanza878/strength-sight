import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthProvider } from '@/contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    try {
      // Login logic here
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div>
      <Input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
      />
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <Button onClick={handleLogin}>Login</Button>
      {error && <div style={ color: 'red' }>{error}</div>}
    </div>
  );
};

export default Login;
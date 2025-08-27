const updateSchema = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/setup/update-timeout-schema', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
};

updateSchema();
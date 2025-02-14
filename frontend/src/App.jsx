import { AppShell, Button, Container, Group, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { IconMoodSmile } from '@tabler/icons-react'

const api = axios.create({
  baseURL: '/api',
})

export default function App() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['memes'],
    queryFn: async () => {
      const response = await api.get('/memes')
      return response.data
    },
  })

  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header>
        <Container size="lg">
          <Group h="100%" px="md">
            <IconMoodSmile size={30} />
            <Title order={1} size="h3">DankFolio</Title>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg" py="xl">
          {isLoading ? (
            <Text>Loading your dank memes... 🚀</Text>
          ) : error ? (
            <Text c="red">Error loading memes: {error.message}</Text>
          ) : (
            <div>
              <Title order={2} mb="lg">Your Meme Collection</Title>
              <Button>Add New Meme</Button>
              
              {/* Display memes here */}
              <Text mt="xl">
                {JSON.stringify(data, null, 2)}
              </Text>
            </div>
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

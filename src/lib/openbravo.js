import axios from 'axios'

const openbravoApi = axios.create({
  baseURL: '/api-ob',
  auth: {
    username: localStorage.getItem('OB_USER'),
    password: localStorage.getItem('OB_KEY'),
  },
  headers: {
    'Content-Type': 'application/json',
  },
})

export default openbravoApi

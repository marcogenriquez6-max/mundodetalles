/**
 * Subida de imágenes al backend. Se usa fetch (no axios) para que el navegador
 * establezca automáticamente el Content-Type multipart/form-data con su boundary.
 */
export const uploadsService = {
  async subirImagen(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)

    const token = localStorage.getItem('token')
    const res = await fetch('/api/uploads/imagen', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    })

    if (!res.ok) {
      let mensaje = 'No se pudo subir la imagen'
      try {
        const data = await res.json()
        if (Array.isArray(data?.message)) mensaje = data.message.join(', ')
        else if (data?.message) mensaje = data.message
      } catch {
        /* respuesta sin cuerpo JSON */
      }
      throw new Error(mensaje)
    }

    const data = await res.json()
    return data.url as string
  },
}

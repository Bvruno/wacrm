import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CeasCourse {
  idCurso: number;
  codigo: string;
  nombre: string;
  vigencia: string;
  horas: string;
  fechaInicio: string;
  descripcion: string;
  urlCertificado: string;
  urlCertificado2: string;
  fecha: string;
  ncodigo: string;
  certificados: number;
  estado: { idEstado: number; nombre: string };
}

export async function POST() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', session.user.id)
    .single();

  if (!profile?.account_id) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 400 });

  const apiUrl = process.env.CEAS_API_URL;
  const apiToken = process.env.CEAS_API_TOKEN;
  if (!apiUrl || !apiToken) return NextResponse.json({ error: 'CEAS no configurado' }, { status: 500 });

  let remoteCourses: CeasCourse[];
  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `CEAS error ${res.status}: ${text}` }, { status: 502 });
    }
    const json = await res.json();
    remoteCourses = json.content ?? json;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error de conexión' }, { status: 502 });
  }

  const results: { external_id: number; title: string; action: 'created' | 'updated' }[] = [];

  for (const ceas of remoteCourses) {
    const title = ceas.nombre.trim();
    const descHtml = ceas.descripcion || '';
    const description = descHtml.replace(/<[^>]*>/g, '').trim().slice(0, 2000);
    const externalId = String(ceas.idCurso);
    const hours = ceas.horas || null;
    const imageUrl = ceas.urlCertificado
      ? `https://api.ceas.pe/uploads/cursos/${ceas.urlCertificado}`
      : null;

    const payload = {
      external_id: externalId,
      title,
      description: description || null,
      hours,
      image_url: imageUrl,
      external_data: ceas as unknown as Record<string, unknown>,
      account_id: profile.account_id,
      user_id: session.user.id,
      is_active: ceas.estado?.nombre === 'Activo',
    };

    const { data: existing } = await supabase
      .from('courses')
      .select('id')
      .eq('external_id', externalId)
      .eq('account_id', profile.account_id)
      .maybeSingle();

    if (existing) {
      await supabase.from('courses').update(payload).eq('id', existing.id);
      results.push({ external_id: ceas.idCurso, title, action: 'updated' });
    } else {
      await supabase.from('courses').insert(payload);
      results.push({ external_id: ceas.idCurso, title, action: 'created' });
    }
  }

  return NextResponse.json({
    message: `Sincronizados ${results.length} cursos`,
    results,
  });
}

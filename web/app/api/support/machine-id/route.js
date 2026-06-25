import { NextResponse } from 'next/server';
import { getMachineId } from '../../../../lib/machine.js';

export async function GET() {
  try {
    const machineId = getMachineId();
    return NextResponse.json({ machineId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

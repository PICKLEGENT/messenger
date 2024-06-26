import prisma from '@/app/libs/prismadb';
import getCurrentUser from '@/app/actions/getCurrentUser';

import { NextResponse } from 'next/server';
import { pusherServer } from '@/app/libs/pusher';

export async function POST(request: Request) {
	try {
		const currentUser = await getCurrentUser();

		const body = await request.json();
		const { message, image, conversationId } = body;

		if (!currentUser?.id || !currentUser?.email) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const newMessage = await prisma.message.create({
			data: {
				body: message,
				image: image,
				conversationId: conversationId,
				sender: {
					connect: {
						id: currentUser.id,
					},
				},
			},
			include: {
				sender: true,
			},
		});

		const updatedConversation = await prisma.conversation.update({
			where: {
				id: conversationId,
			},
			data: {
				lastMessageAt: new Date(),
			},
			include: {
				users: true,
			},
		});

		await pusherServer.trigger(conversationId, 'messages:new', newMessage);

		return NextResponse.json(newMessage);
	} catch (error) {
		console.log(error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}

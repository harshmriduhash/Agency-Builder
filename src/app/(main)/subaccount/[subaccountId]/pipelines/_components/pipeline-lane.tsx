'use client'
import CreateLaneForm from '@/components/forms/lane-form'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteLane, saveActivityLogsNotification } from '@/lib/queries'
import { LaneDetail, TicketWithTags } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useModal } from '@/providers/modal-provider'
import { Edit, MoreVertical, PlusCircleIcon, Trash } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { Dispatch, SetStateAction, useMemo } from 'react'
import CustomModal from '@/components/global/custom-modal'
import TicketForm from '@/components/forms/ticket-form'
import PipelineTicket from './pipeline-ticket'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface PipelaneLaneProps {
  setAllTickets: Dispatch<SetStateAction<TicketWithTags>>;
  allTickets: TicketWithTags;
  tickets: TicketWithTags;
  pipelineId: string;
  laneDetails: LaneDetail;
  subaccountId: string;
}

const PipelineLane: React.FC<PipelaneLaneProps> = ({
  setAllTickets,
  tickets,
  pipelineId,
  laneDetails,
  subaccountId,
  allTickets,
}) => {
  const { setOpen } = useModal()
  const router = useRouter()

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: laneDetails.id.toString(),
  });
  const style = transform ? {
    transform: CSS.Transform.toString(transform),
    transition,
  } : undefined;

  const amt = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  })

  const laneAmt = useMemo(() => {
    return tickets.reduce(
      (sum, ticket) => sum + (Number(ticket?.value) || 0),
      0
    )
  }, [tickets]);

  const addNewTicket = (ticket: TicketWithTags[0]) => {
    setAllTickets([...allTickets, ticket]);
  }

  const handleCreateTicket = () => {
    setOpen(
      <CustomModal
        title="Create A Ticket"
        subheading="Tickets are a great way to keep track of tasks"
      >
        <TicketForm
          getNewTicket={addNewTicket}
          laneId={laneDetails.id}
          subaccountId={subaccountId}
        />
      </CustomModal>
    )
  }

  const handleEditLane = () => {
    setOpen(
      <CustomModal
        title="Edit Lane Details"
        subheading=""
      >
        <CreateLaneForm
          pipelineId={pipelineId}
          defaultData={laneDetails}
        />
      </CustomModal>
    )
  }

  const handleDeleteLane = async () => {
    try {
      const response = await deleteLane(laneDetails.id)
      await saveActivityLogsNotification({
        agencyId: undefined,
        description: `Deleted a lane | ${response?.name}`,
        subaccountId,
      })
      router.refresh()
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div
      ref={setNodeRef}
      className="h-full"
      style={style}
    >
      <AlertDialog>
        <DropdownMenu>
          <div className="bg-slate-200/30 dark:bg-background/20 h-[700px] w-[300px] px-4 relative rounded-lg overflow-visible flex-shrink-0">
            <div
              className="h-14 backdrop-blur-lg dark:bg-background/40 bg-slate-200/60 absolute top-0 left-0 right-0 z-10"
              {...attributes}
              {...listeners}
            >
              <div className="h-full flex items-center p-4 justify-between cursor-grab border-b-[1px]">
                <div className="flex items-center w-full gap-2">
                  <div
                    className={cn('w-4 h-4 rounded-full')}
                    style={{ background: laneDetails.color }}
                  />
                  <span className="font-bold text-sm">
                    {laneDetails.name}
                  </span>
                </div>
                <div className="flex items-center flex-row">
                  <Badge className="bg-white text-black">
                    {amt.format(laneAmt)}
                  </Badge>
                  <DropdownMenuTrigger>
                    <MoreVertical className="text-muted-foreground cursor-pointer" />
                  </DropdownMenuTrigger>
                </div>
              </div>
            </div>

            <div className=" max-h-[700px] overflow-scroll invisible-scrollbar pt-12">
              <SortableContext
                id={laneDetails.id.toString()}
                items={tickets}
                strategy={verticalListSortingStrategy}
              >
                <div className='mt-5'>
                  {tickets.map((ticket) => (
                    (ticket && ticket.id) &&
                    <PipelineTicket
                      allTickets={allTickets}
                      setAllTickets={setAllTickets}
                      subaccountId={subaccountId}
                      ticket={ticket}
                      key={ticket.id.toString()}
                    />
                  ))}

                  {tickets.length === 0 && (
                    <div className="text-sm text-center text-muted-foreground">
                      No tickets in this lane
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>

            <DropdownMenuContent>
              <DropdownMenuLabel>Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <AlertDialogTrigger>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Trash size={15} />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>

              <DropdownMenuItem
                className="flex items-center gap-2"
                onClick={handleEditLane}
              >
                <Edit size={15} />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2"
                onClick={handleCreateTicket}
              >
                <PlusCircleIcon size={15} />
                Create Ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </div>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete
                your account and remove your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex items-center">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive"
                onClick={handleDeleteLane}
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </DropdownMenu>
      </AlertDialog>
    </div >
  )
}

export default PipelineLane;


export function PipelineLaneOverlay({ name, color }: { name: string; color: string; }) {
  return (
    <div className="bg-slate-200/30 dark:bg-background/20 h-[700px] w-[300px] md:translate-x-[-300px] px-4 relative rounded-lg overflow-visible flex-shrink-0">
      <div
        className="h-14 backdrop-blur-lg dark:bg-background/40 bg-slate-200/60 absolute top-0 left-0 right-0 z-0"
      >
        <div className="h-full flex items-center p-4 justify-between cursor-grab border-b-[1px] ">
          <div className="flex items-center w-full gap-2">
            <div
              className={cn('w-4 h-4 rounded-full')}
              style={{ background: color }}
            />
            <span className="font-bold text-sm">
              {name}
            </span>
          </div>
          <div className="flex items-center flex-row">
            <Badge className="bg-white text-black">
              {"xxxx$"}
            </Badge>
            <div>
              <MoreVertical className="text-muted-foreground cursor-pointer" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <div>Options</div>
        <div>
          <div className="flex items-center gap-2">
            <Trash size={15} />
            Delete
          </div>
        </div>
      </div>
    </div>

  )
}

'use client';
import LaneForm from "@/components/forms/lane-form";
import CustomModal from "@/components/global/custom-modal";
import { Button } from "@/components/ui/button";
import {
  LaneDetail,
  PipelineDetailsWithLanesCardsTagsTickets,
  TicketAndTags
} from "@/lib/types";
import { useModal } from "@/providers/modal-provider";
import { Lane, Ticket } from "@prisma/client";
import { Flag, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import PipelineLane, { PipelineLaneOverlay } from "./pipeline-lane";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { TicketOverlay } from "./pipeline-ticket";

type Props = {
  lanes: LaneDetail[];
  pipelineId: string;
  subaccountId: string;
  pipelineDetails: PipelineDetailsWithLanesCardsTagsTickets;
  updateLanesOrder: (lanes: Lane[]) => Promise<void>;
  updateTicketsOrder: (tickets: Ticket[]) => Promise<void>;
}

const PipelineView: React.FC<Props> = ({
  lanes,
  pipelineDetails,
  subaccountId,
  pipelineId,
  updateLanesOrder,
  updateTicketsOrder
}) => {
  const { setOpen } = useModal();
  const router = useRouter();
  const [allLanes, setAllLanes] = useState<LaneDetail[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<{ id: string; containerId: string; } | null>(null);

  const detectSensor = () => {
    const isWebEntry = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    console.log("isWebEntry: ", isWebEntry);
    return !isWebEntry ? PointerSensor : TouchSensor;
  }
  const sensors = useSensors(
    useSensor(detectSensor(), {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setAllLanes(lanes);
  }, [lanes]);

  const ticketsFromAllLanes: TicketAndTags[] = [];

  lanes.forEach(item => {
    item.Tickets.forEach(i => ticketsFromAllLanes.push(i));
  });

  const [allTickets, setAllTickets] = useState(ticketsFromAllLanes);

  const handleAddLane = () => {
    setOpen(
      <CustomModal
        title="Create Lane"
        subheading="Lanes allow you to group your tickets together."
      >
        <LaneForm pipelineId={pipelineId} />
      </CustomModal>
    )
  }

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const containerId: string = active.data.current?.sortable?.containerId;
    if (containerId === 'lanes')
      setActiveId(active?.id?.toString());
    else {
      setActiveTicket({ id: active?.id?.toString(), containerId: containerId });
    }
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const containerId: string = active.data.current?.sortable?.containerId;
    if (containerId === 'lanes') {
      const source = allLanes.findIndex(lane => lane.id === active?.id);
      const destination = allLanes.findIndex(lane => lane.id === over?.id);
      if (source != destination) {
        const newLanes = [...allLanes]
          .toSpliced(source, 1)
          .toSpliced(destination, 0, allLanes[source])
          .map((lane, idx) => {
            return { ...lane, order: idx }
          })
        setAllLanes(newLanes)
        updateLanesOrder(newLanes)
      }
    }
    else {
      const sourceContainerId: string = active.data?.current?.sortable?.containerId;
      const destContainerId: string = over?.data?.current?.sortable?.containerId;

      let newLanes = [...allLanes];
      const originLane = newLanes.find((lane) => lane.id === sourceContainerId);
      const destinationLane = newLanes.find((lane) => lane.id === destContainerId);

      if (!originLane || !destinationLane) return;

      if (containerId === destContainerId) {
        const sourceLane = allLanes.find(lane => lane.id === sourceContainerId)!;
        const source = sourceLane.Tickets.findIndex(ticket => ticket.id === active?.id);
        const destination = sourceLane.Tickets.findIndex(ticket => ticket.id === over?.id);

        const newOrderedTickets = [...originLane.Tickets]
          .toSpliced(source, 1)
          .toSpliced(destination, 0, originLane.Tickets[source])
          .map((item, idx) => {
            return { ...item, order: idx }
          });

        const newOrderedTicketsLanes = newLanes.map((lane) => {
          if (lane.id === originLane.id) {
            lane.Tickets = newOrderedTickets;
          }
          return lane;
        });
        setAllLanes(newOrderedTicketsLanes);
        updateTicketsOrder(newOrderedTickets);
        setActiveTicket(null);
        router.refresh();
      }
      else {
        const sourceLane = allLanes.find(lane => lane.id === sourceContainerId)!;
        const destinationLane = allLanes.find(lane => lane.id === destContainerId)!;

        if (destContainerId === 'lanes') {
          let newLanes = [...allLanes];
          const originLane = newLanes.find(
            (lane) => lane.id === sourceContainerId
          )!;
          const destLaneId = over?.id;
          const destinationLane = newLanes.find(
            (lane) => lane.id === destLaneId
          )!;

          const source = originLane.Tickets.findIndex(ticket => ticket.id === active?.id);

          const [currentTicket] = originLane.Tickets.splice(source, 1);

          originLane.Tickets.forEach((ticket, idx) => {
            ticket.order = idx
          });

          destinationLane.Tickets.push({
            ...currentTicket,
            laneId: destContainerId,
          });

          destinationLane.Tickets.forEach((ticket, idx) => {
            ticket.order = idx
          });
          const newOrderedTicketsLanes = newLanes.map((lane) => {
            if (lane.id === originLane.id) {
              lane.Tickets = originLane.Tickets;
            }
            if (lane.id === destinationLane.id) {
              lane.Tickets = destinationLane.Tickets;
            }
            return lane;
          });
          setAllLanes(newOrderedTicketsLanes);
          updateTicketsOrder([
            ...destinationLane.Tickets,
            ...originLane.Tickets,
          ]);
          router.refresh();
        } else {

          const source = sourceLane.Tickets.findIndex(ticket => ticket.id === active?.id);
          const destination = destinationLane.Tickets.findIndex(ticket => ticket.id === over?.id);

          const [currentTicket] = originLane.Tickets.splice(source, 1);

          originLane.Tickets.forEach((ticket, idx) => {
            ticket.order = idx
          });

          destinationLane.Tickets.splice(destination, 0, {
            ...currentTicket,
            laneId: destContainerId,
          });

          destinationLane.Tickets.forEach((ticket, idx) => {
            ticket.order = idx
          });

          const newOrderedTicketsLanes = newLanes.map((lane) => {
            if (lane.id === originLane.id) {
              lane.Tickets = originLane.Tickets;
            }
            if (lane.id === destinationLane.id) {
              lane.Tickets = destinationLane.Tickets;
            }
            return lane;
          });
          setAllLanes(newOrderedTicketsLanes);
          updateTicketsOrder([
            ...destinationLane.Tickets,
            ...originLane.Tickets,
          ]);
          router.refresh();
        }
      }
    }
    setActiveId(null);
    setActiveTicket(null);
  }

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const containerId: string = active.data.current?.sortable?.containerId;
    if (containerId !== 'lanes') {
      const sourceContainerId: string = active.data?.current?.sortable?.containerId;
      const destContainerId: string = over?.data?.current?.sortable?.containerId;

      if (destContainerId === 'lanes') {
        let newLanes = [...allLanes];
        const originLane = newLanes.find(
          (lane) => lane.id === sourceContainerId
        )!;
        const destLaneId = over?.id;
        const destinationLane = newLanes.find(
          (lane) => lane.id === destLaneId
        )!;

        const source = originLane.Tickets.findIndex(ticket => ticket.id === active?.id);

        const [currentTicket] = originLane.Tickets.splice(source, 1);

        originLane.Tickets.forEach((ticket, idx) => {
          ticket.order = idx
        });

        destinationLane.Tickets.push({
          ...currentTicket,
          laneId: destLaneId?.toString()!,
        });

        destinationLane.Tickets.forEach((ticket, idx) => {
          ticket.order = idx
        });
        const newOrderedTicketsLanes = newLanes.map((lane) => {
          if (lane.id === originLane.id) {
            lane.Tickets = originLane.Tickets;
          }
          if (lane.id === destinationLane.id) {
            lane.Tickets = destinationLane.Tickets;
          }
          return lane;
        });
        setAllLanes(newOrderedTicketsLanes);
        updateTicketsOrder([
          ...destinationLane.Tickets,
          ...originLane.Tickets,
        ]);
        router.refresh();
        return;
      }

      let newLanes = [...allLanes];
      const originLane = newLanes.find(
        (lane) => lane.id === sourceContainerId
      );
      const destinationLane = newLanes.find(
        (lane) => lane.id === destContainerId
      );

      if (!originLane || !destinationLane) return;

      if (containerId !== destContainerId) {
        const source = originLane.Tickets.findIndex(ticket => ticket.id === active?.id);
        const destination = destinationLane.Tickets.findIndex(ticket => ticket.id === over?.id);

        const [currentTicket] = originLane.Tickets.splice(source, 1);

        originLane.Tickets.forEach((ticket, idx) => {
          ticket.order = idx
        });

        destinationLane.Tickets.splice(destination, 0, {
          ...currentTicket,
          laneId: destContainerId,
        });

        destinationLane.Tickets.forEach((ticket, idx) => {
          ticket.order = idx
        });

        const newOrderedTicketsLanes = newLanes.map((lane) => {
          if (lane.id === originLane.id) {
            lane.Tickets = originLane.Tickets;
          }
          if (lane.id === destinationLane.id) {
            lane.Tickets = destinationLane.Tickets;
          }
          return lane;
        });
        setAllLanes(newOrderedTicketsLanes);
        updateTicketsOrder([
          ...destinationLane.Tickets,
          ...originLane.Tickets,
        ]);
        router.refresh();
      }
    }
  }


  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      <div className="bg-white/60 dark:bg-background/60 rounded-xl p-4 use-automation-zoom-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl">
            {pipelineDetails?.name}
          </h1>
          <Button
            className="flex items-center gap-4"
            onClick={handleAddLane}
          >
            <Plus size={15} />
            Create Lane
          </Button>
        </div>
        <SortableContext
          id="lanes"
          items={allLanes}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex mt-4 overflow-scroll scroll-bar gap-4 relative">
            {allLanes.map((lane) => (
              <PipelineLane
                allTickets={allTickets}
                setAllTickets={setAllTickets}
                subaccountId={subaccountId}
                pipelineId={pipelineId}
                tickets={lane.Tickets}
                laneDetails={lane}
                key={lane.id.toString()}
              />
            ))}
            <DragOverlay dropAnimation={null}>
              {activeId && (
                <PipelineLaneOverlay
                  name={allLanes.find(lane => lane.id === activeId)?.name!}
                  color={allLanes.find(lane => lane.id === activeId)?.color!}
                />
              )}
              {activeTicket && (
                <TicketOverlay
                  ticket={allTickets.find(ticket => ticket.id === activeTicket.id)!}
                />
              )}
            </DragOverlay>
          </div>
        </SortableContext>
        {allLanes.length === 0 && (
          <div className="flex items-center justify-center w-full flex-col">
            <div className="opacity-100">
              <Flag
                width="100%"
                height="100%"
                className="text-muted-foreground"
              />
            </div>
          </div>
        )}
      </div>
    </DndContext>
  )
}

export default PipelineView
